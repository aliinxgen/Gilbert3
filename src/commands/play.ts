import {
  ActionRowBuilder,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { Command } from "../types/command.ts";
import { playerManager } from "../index.ts";
import { queuedEmbed } from "../music/embeds.ts";
import { TrackItem } from "../music/types.ts";

function normalizeQuery(input: string): string {
  const trimmed = input.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `ytsearch:${trimmed}`;
}

function toTrack(raw: any, userId: string): TrackItem {
  return {
    encoded: raw.encoded,
    title: raw.info.title,
    author: raw.info.author ?? "Necunoscut",
    uri: raw.info.uri ?? "",
    length: raw.info.length ?? 0,
    requestedBy: userId,
  };
}

function getThumbnail(raw: any): string | null {
  if (raw?.info?.artworkUrl) return raw.info.artworkUrl;
  return null;
}

function buildSearchResultsEmbed(
  userQuery: string,
  tracks: any[],
  requesterId: string
) {
  const lines = tracks.map((track, index) => {
    const title = track.info.title ?? "Titlu necunoscut";
    const author = track.info.author ?? "Necunoscut";
    return `**${index + 1}.** ${title}\nArtist: ${author}`;
  });

  return new EmbedBuilder()
    .setTitle("🔎 Rezultate căutare")
    .setDescription(
      `**Ai cerut:** ${userQuery}\n\nAlege o melodie din opțiunile de mai jos.`
    )
    .setFooter({
      text: `Cerut de ${requesterId} • Selecția expiră în 30 secunde`,
    });
}

const playCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Redă muzică")
    .addStringOption((opt) =>
      opt.setName("query").setDescription("Link sau nume").setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.guild || !interaction.channel) return;

    const member = interaction.guild.members.cache.get(interaction.user.id);
    const vc = member?.voice.channel;

    if (!vc) {
      await interaction.reply({
        content: "Intră într-un voice channel.",
        ephemeral: true,
      });
      return;
    }

    const rawUserQuery = interaction.options.getString("query", true);

    await interaction.deferReply();

    const query = normalizeQuery(rawUserQuery);

    await playerManager.joinVoiceChannel({
      guildId: interaction.guild.id,
      channelId: vc.id,
      shardId: 0,
      textChannelId: interaction.channel.id,
    });

    const res: any = await playerManager.resolve(query);

    if (!res || res.loadType === "empty") {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Nu am găsit nimic")
            .setDescription(`**Ai cerut:** ${rawUserQuery}\n\nÎncearcă alt nume.`),
        ],
      });
      return;
    }

    if (res.loadType === "error") {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Eroare")
            .setDescription(res.data?.message ?? "Eroare necunoscută"),
        ],
      });
      return;
    }

    if (res.loadType === "track") {
      const track = toTrack(res.data, interaction.user.id);
      const state = playerManager.getState(interaction.guild.id);

      if (!state.current) {
        await playerManager.playNow(interaction.guild.id, track);
      } else {
        await playerManager.enqueue(interaction.guild.id, track);
      }

      const embed = queuedEmbed(track, state.queue.length);
      const thumbnail = getThumbnail(res.data);
      if (thumbnail) embed.setThumbnail(thumbnail);

      embed.setDescription(
        `**Ai cerut:** ${rawUserQuery}\n\n` +
          `**[${track.title}](${track.uri || "https://discord.com"})**`
      );

      await interaction.editReply({
        embeds: [embed],
      });

      return;
    }

    if (res.loadType === "playlist") {
      const tracks = res.data.tracks;

      if (!tracks.length) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("📚 Playlist gol")
              .setDescription("Playlist-ul nu conține melodii."),
          ],
        });
        return;
      }

      const first = toTrack(tracks[0], interaction.user.id);
      const state = playerManager.getState(interaction.guild.id);

      if (!state.current) {
        await playerManager.playNow(interaction.guild.id, first);
      } else {
        await playerManager.enqueue(interaction.guild.id, first);
      }

      for (const t of tracks.slice(1)) {
        await playerManager.enqueue(
          interaction.guild.id,
          toTrack(t, interaction.user.id)
        );
      }

      const embed = new EmbedBuilder()
        .setTitle("📚 Playlist adăugat")
        .setDescription(
          `**Ai cerut:** ${rawUserQuery}\n\n` +
            `Melodii adăugate: **${tracks.length}**`
        );

      const thumbnail = getThumbnail(tracks[0]);
      if (thumbnail) embed.setThumbnail(thumbnail);

      await interaction.editReply({
        embeds: [embed],
      });

      return;
    }

    if (res.loadType === "search") {
      const tracks = res.data.slice(0, 10);

      if (!tracks.length) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Nu am găsit nimic")
              .setDescription(`**Ai cerut:** ${rawUserQuery}\n\nÎncearcă alt nume.`),
          ],
        });
        return;
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`play:${interaction.user.id}`)
        .setPlaceholder("Alege melodia")
        .addOptions(
          tracks.map((t: any, i: number) => ({
            label: t.info.title.slice(0, 100),
            description: (t.info.author ?? "Necunoscut").slice(0, 100),
            value: String(i),
          }))
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        menu
      );

      const embed = buildSearchResultsEmbed(
        rawUserQuery,
        tracks,
        interaction.user.username
      );

      const firstThumbnail = getThumbnail(tracks[0]);
      if (firstThumbnail) {
        embed.setThumbnail(firstThumbnail);
      }

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      const msg = await interaction.fetchReply();

      try {
        const select = await msg.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 30000,
          filter: (i) =>
            i.user.id === interaction.user.id &&
            i.customId === `play:${interaction.user.id}`,
        });

        const chosen = tracks[Number(select.values[0])];
        const track = toTrack(chosen, interaction.user.id);
        const state = playerManager.getState(interaction.guild.id);

        if (!state.current) {
          await playerManager.playNow(interaction.guild.id, track);
        } else {
          await playerManager.enqueue(interaction.guild.id, track);
        }

        const embed = queuedEmbed(track, state.queue.length);
        const thumbnail = getThumbnail(chosen);
        if (thumbnail) embed.setThumbnail(thumbnail);

        embed.setDescription(
          `**Ai cerut:** ${rawUserQuery}\n\n` +
            `**Ai ales:** ${track.title}`
        );

        await select.update({
          embeds: [embed],
          components: [],
        });
      } catch {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("⌛ Expirat")
              .setDescription(
                `**Ai cerut:** ${rawUserQuery}\n\nSelecția a expirat. Mai dă o dată comanda \`/play\`.`
              ),
          ],
          components: [],
        });
      }

      return;
    }
  },
};

export default playCommand;
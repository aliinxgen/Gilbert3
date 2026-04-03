import { EmbedBuilder } from "discord.js";
import { GuildPlayerState, TrackItem } from "./types.ts";

function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function nowPlayingEmbed(track: TrackItem, state: GuildPlayerState) {
  return new EmbedBuilder()
    .setTitle("🎶 Acum se redă")
    .setDescription(`**[${track.title}](${track.uri || "https://discord.com"})**`)
    .addFields(
      { name: "Artist", value: track.author || "Necunoscut", inline: true },
      { name: "Durată", value: formatMs(track.length), inline: true },
      { name: "Cerută de", value: `<@${track.requestedBy}>`, inline: true },
      { name: "Volum", value: `${state.volume}%`, inline: true },
      { name: "Loop", value: state.loopMode, inline: true },
      { name: "În coadă", value: `${state.queue.length}`, inline: true }
    )
    .setFooter({ text: "Gilbert 3" });
}

export function queuedEmbed(track: TrackItem, queueLength: number) {
  return new EmbedBuilder()
    .setTitle("➕ Adăugat în coadă")
    .setDescription(`**[${track.title}](${track.uri || "https://discord.com"})**`)
    .addFields(
      { name: "Artist", value: track.author || "Necunoscut", inline: true },
      { name: "Durată", value: formatMs(track.length), inline: true },
      { name: "Poziție în coadă", value: `${queueLength}`, inline: true }
    )
    .setFooter({ text: "Gilbert 3" });
}

export function queueEmbed(
  current: TrackItem | null,
  queue: TrackItem[],
  page = 0,
  pageSize = 10
) {
  const start = page * pageSize;
  const slice = queue.slice(start, start + pageSize);

  const description =
    slice.length === 0
      ? "Coada este goală."
      : slice
          .map(
            (track, index) =>
              `**${start + index + 1}.** [${track.title}](${track.uri || "https://discord.com"}) • ${formatMs(track.length)} • <@${track.requestedBy}>`
          )
          .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("📜 Coada serverului")
    .setDescription(description)
    .setFooter({
      text: `Pagina ${page + 1} • Total melodii în coadă: ${queue.length}`,
    });

  if (current) {
    embed.addFields({
      name: "Se redă acum",
      value: `**[${current.title}](${current.uri || "https://discord.com"})** • ${formatMs(current.length)}`,
    });
  }

  return embed;
}
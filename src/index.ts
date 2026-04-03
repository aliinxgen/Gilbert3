import "dotenv/config";
import {
  ButtonInteraction,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";

import pingCommand from "./commands/ping.ts";
import playCommand from "./commands/play.ts";
import pauseCommand from "./commands/pause.ts";
import resumeCommand from "./commands/resume.ts";
import skipCommand from "./commands/skip.ts";
import stopCommand from "./commands/stop.ts";
import queueCommand from "./commands/queue.ts";
import nowPlayingCommand from "./commands/nowplaying.ts";
import volumeCommand from "./commands/volume.ts";
import loopCommand from "./commands/loop.ts";
import shuffleCommand from "./commands/shuffle.ts";

import { Command } from "./types/command.ts";
import { PlayerManager } from "./music/playerManager.ts";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

export const playerManager = new PlayerManager(client);

const commands = new Collection<string, Command>();
[
  pingCommand,
  playCommand,
  pauseCommand,
  resumeCommand,
  skipCommand,
  stopCommand,
  queueCommand,
  nowPlayingCommand,
  volumeCommand,
  loopCommand,
  shuffleCommand,
].forEach((command) => commands.set(command.data.name, command));

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);

  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token) throw new Error("DISCORD_TOKEN lipsește din .env");
  if (!clientId) throw new Error("DISCORD_CLIENT_ID lipsește din .env");

  const rest = new REST({ version: "10" }).setToken(token);

  await rest.put(Routes.applicationCommands(clientId), {
    body: [...commands.values()].map((command) => command.data.toJSON()),
  });

  console.log("Slash commands registered.");
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "A apărut o eroare.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "A apărut o eroare.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.isButton()) {
    await handlePlayerButtons(interaction);
  }
});

async function handlePlayerButtons(interaction: ButtonInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "Doar pe server.", ephemeral: true });
    return;
  }

  try {
    switch (interaction.customId) {
case "player_pause_resume": {
  const result = await playerManager.togglePause(interaction.guild.id);

  await interaction.reply({
    content: result === "paused" ? "⏸️ Pauză." : "▶️ Am reluat redarea.",
    ephemeral: true,
  });
  break;
}

      case "player_skip":
        await playerManager.skip(interaction.guild.id);
        await interaction.reply({ content: "⏭️ Skip.", ephemeral: true });
        break;

      case "player_stop":
        await playerManager.stop(interaction.guild.id);
        await interaction.reply({ content: "⏹️ Stop.", ephemeral: true });
        break;

      case "player_shuffle":
        playerManager.shuffle(interaction.guild.id);
        await interaction.reply({ content: "🔀 Shuffle.", ephemeral: true });
        break;

      case "player_loop": {
        const mode = playerManager.toggleLoop(interaction.guild.id);
        await interaction.reply({ content: `🔁 Loop: **${mode}**`, ephemeral: true });
        break;
      }

      default:
        await interaction.reply({ content: "Buton necunoscut.", ephemeral: true });
        break;
    }
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: "Eroare la controlul playerului.", ephemeral: true });
  }
}

playerManager.shoukaku.on("ready", (name) => {
  console.log(`Lavalink node ${name} connected.`);
});

playerManager.shoukaku.on("error", (name, error) => {
  console.error(`Lavalink node ${name} error:`, error);
});

client.login(process.env.DISCORD_TOKEN);
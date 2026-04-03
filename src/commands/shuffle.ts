import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/command.ts";
import { playerManager } from "../index.ts";

const shuffleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Amestecă melodiile din coadă"),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Doar pe server.", ephemeral: true });
      return;
    }

    playerManager.shuffle(interaction.guild.id);
    await interaction.reply("🔀 Coada a fost amestecată.");
  },
};

export default shuffleCommand;
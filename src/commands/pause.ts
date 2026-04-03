import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/command.ts";
import { playerManager } from "../index.ts";

const pauseCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pune melodia pe pauză"),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Doar pe server.", ephemeral: true });
      return;
    }

    await playerManager.pause(interaction.guild.id);
    await interaction.reply("⏸️ Pauză.");
  },
};

export default pauseCommand;
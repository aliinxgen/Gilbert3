import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/command.ts";
import { playerManager } from "../index.ts";

const resumeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Reia melodia"),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Doar pe server.", ephemeral: true });
      return;
    }

    await playerManager.resume(interaction.guild.id);
    await interaction.reply("▶️ Am reluat redarea.");
  },
};

export default resumeCommand;
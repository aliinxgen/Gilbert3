import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/command.ts";
import { playerManager } from "../index.ts";

const volumeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Setează volumul")
    .addIntegerOption((option) =>
      option
        .setName("value")
        .setDescription("Volum între 1 și 200")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(200)
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Doar pe server.", ephemeral: true });
      return;
    }

    const value = interaction.options.getInteger("value", true);
    await playerManager.setVolume(interaction.guild.id, value);
    await interaction.reply(`🔊 Volumul a fost setat la **${value}%**.`);
  },
};

export default volumeCommand;
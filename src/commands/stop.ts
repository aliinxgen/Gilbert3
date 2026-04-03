import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/command.ts";
import { playerManager } from "../index.ts";

const stopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Oprește redarea și golește coada"),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Doar pe server.", ephemeral: true });
      return;
    }

    await playerManager.stop(interaction.guild.id);
    await interaction.reply("⏹️ Redarea a fost oprită și coada a fost ștearsă.");
  },
};

export default stopCommand;
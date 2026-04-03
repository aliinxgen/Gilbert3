import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/command.ts";
import { playerManager } from "../index.ts";

const loopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Schimbă modul loop"),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Doar pe server.", ephemeral: true });
      return;
    }

    const mode = playerManager.toggleLoop(interaction.guild.id);
    await interaction.reply(`🔁 Mod loop: **${mode}**`);
  },
};

export default loopCommand;
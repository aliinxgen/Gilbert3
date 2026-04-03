import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/command.ts";

const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Verifică dacă botul funcționează"),

  async execute(interaction) {
    await interaction.reply("Pong! Gilbert 3 e online.");
  },
};

export default pingCommand;
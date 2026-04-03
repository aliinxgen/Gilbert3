import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/command.ts";
import { playerManager } from "../index.ts";
import { nowPlayingEmbed } from "../music/embeds.ts";

const nowPlayingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Arată ce se redă acum"),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Doar pe server.", ephemeral: true });
      return;
    }

    const state = playerManager.getState(interaction.guild.id);

    if (!state.current) {
      await interaction.reply("Nu se redă nimic acum.");
      return;
    }

    await interaction.reply({
      embeds: [nowPlayingEmbed(state.current, state)],
    });
  },
};

export default nowPlayingCommand;
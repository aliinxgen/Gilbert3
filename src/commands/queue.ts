import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/command.ts";
import { playerManager } from "../index.ts";
import { queueEmbed } from "../music/embeds.ts";

const queueCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Arată coada curentă"),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Doar pe server.", ephemeral: true });
      return;
    }

    const state = playerManager.getState(interaction.guild.id);
    await interaction.reply({
      embeds: [queueEmbed(state.current, state.queue)],
    });
  },
};

export default queueCommand;
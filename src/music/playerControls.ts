import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

export function createPlayerControls() {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("player_pause_resume")
      .setLabel("Pause/Resume")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("player_skip")
      .setLabel("Skip")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("player_stop")
      .setLabel("Stop")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("player_shuffle")
      .setLabel("Shuffle")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("player_loop")
      .setLabel("Loop")
      .setStyle(ButtonStyle.Secondary)
  );

  return [row];
}
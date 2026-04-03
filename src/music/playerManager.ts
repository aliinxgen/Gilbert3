import { Client, TextChannel } from "discord.js";
import { Connectors, Player, Shoukaku } from "shoukaku";
import { createPlayerControls } from "./playerControls.ts";
import { nowPlayingEmbed } from "./embeds.ts";
import { GuildPlayerState, LoopMode, TrackItem } from "./types.ts";

export class PlayerManager {
  public readonly shoukaku: Shoukaku;
  private readonly states = new Map<string, GuildPlayerState>();
  private readonly client: Client;

  constructor(client: Client) {
    this.client = client;

    this.shoukaku = new Shoukaku(
      new Connectors.DiscordJS(client),
      [
        {
          name: "main",
          url: `${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT}`,
          auth: process.env.LAVALINK_PASSWORD ?? "youshallnotpass",
        },
      ],
      {
        resume: true,
        resumeTimeout: 30,
        reconnectTries: 3,
        restTimeout: 10000,
        moveOnDisconnect: false,
      }
    );
  }

  public getState(guildId: string): GuildPlayerState {
    let state = this.states.get(guildId);

    if (!state) {
      state = {
        textChannelId: "",
        current: null,
        queue: [],
        volume: 100,
        loopMode: "off",
        paused: false,
      };
      this.states.set(guildId, state);
    }

    return state;
  }

  public getPlayer(guildId: string): Player | undefined {
    return this.shoukaku.players.get(guildId);
  }

  public async joinVoiceChannel(options: {
    guildId: string;
    channelId: string;
    shardId: number;
    textChannelId: string;
  }): Promise<Player> {
    let player = this.shoukaku.players.get(options.guildId);

    if (!player) {
      player = await this.shoukaku.joinVoiceChannel({
        guildId: options.guildId,
        channelId: options.channelId,
        shardId: options.shardId,
        deaf: true,
      });

      this.attachPlayerEvents(options.guildId, player);
    }

    const state = this.getState(options.guildId);
    state.textChannelId = options.textChannelId;

    try {
      await player.setGlobalVolume(state.volume);
    } catch {
      // ignore
    }

    return player;
  }

  private attachPlayerEvents(guildId: string, player: Player) {
    const anyPlayer = player as unknown as {
      __gilbertAttached?: boolean;
      on: (event: string, listener: (...args: unknown[]) => void) => void;
    };

    if (anyPlayer.__gilbertAttached) return;
    anyPlayer.__gilbertAttached = true;

    anyPlayer.on("end", async () => {
      const state = this.getState(guildId);
      state.paused = false;
      await this.playNext(guildId);
    });

    anyPlayer.on("closed", async () => {
      await this.cleanupGuild(guildId);
    });
  }

  private async cleanupGuild(guildId: string) {
    const state = this.getState(guildId);
    state.current = null;
    state.queue = [];
    state.controllerMessageId = undefined;
    state.paused = false;
  }

  public async resolve(query: string) {
    const firstNode = this.shoukaku.nodes.values().next().value;

    if (!firstNode) {
      throw new Error("Nu există nod Lavalink conectat.");
    }

    return await firstNode.rest.resolve(query);
  }

  public async enqueue(guildId: string, track: TrackItem) {
    const state = this.getState(guildId);
    state.queue.push(track);
  }

  public async playNow(guildId: string, track: TrackItem) {
    const player = this.getPlayer(guildId);
    if (!player) {
      throw new Error("Playerul nu există.");
    }

    const state = this.getState(guildId);
    state.current = track;
    state.paused = false;

    await player.playTrack({
      track: {
        encoded: track.encoded,
      },
    });

    await this.sendOrUpdateNowPlaying(guildId);
  }

  public async playNext(guildId: string) {
    const player = this.getPlayer(guildId);
    if (!player) return;

    const state = this.getState(guildId);
    const current = state.current;

    if (current) {
      if (state.loopMode === "track") {
        state.paused = false;
        await player.playTrack({
          track: {
            encoded: current.encoded,
          },
        });
        await this.sendOrUpdateNowPlaying(guildId);
        return;
      }

      if (state.loopMode === "queue") {
        state.queue.push(current);
      }
    }

    const next = state.queue.shift() ?? null;
    state.current = next;
    state.paused = false;

    if (!next) {
      return;
    }

    await player.playTrack({
      track: {
        encoded: next.encoded,
      },
    });

    await this.sendOrUpdateNowPlaying(guildId);
  }

  public async pause(guildId: string) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error("Nu există player.");

    await player.setPaused(true);
    this.getState(guildId).paused = true;
  }

  public async resume(guildId: string) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error("Nu există player.");

    await player.setPaused(false);
    this.getState(guildId).paused = false;
  }

  public async togglePause(guildId: string): Promise<"paused" | "resumed"> {
    const state = this.getState(guildId);

    if (state.paused) {
      await this.resume(guildId);
      return "resumed";
    }

    await this.pause(guildId);
    return "paused";
  }

  public async skip(guildId: string) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error("Nu există player.");

    this.getState(guildId).paused = false;
    await player.stopTrack();
  }

  public async stop(guildId: string) {
    await this.cleanupGuild(guildId);

    const player = this.getPlayer(guildId);
    if (player) {
      try {
        await player.stopTrack();
      } catch {
        // ignore
      }
    }

    try {
      await this.shoukaku.leaveVoiceChannel(guildId);
    } catch {
      // ignore
    }
  }

  public async setVolume(guildId: string, volume: number) {
    const state = this.getState(guildId);
    state.volume = volume;

    const player = this.getPlayer(guildId);
    if (!player) throw new Error("Nu există player.");
    await player.setGlobalVolume(volume);
  }

  public toggleLoop(guildId: string): LoopMode {
    const state = this.getState(guildId);

    if (state.loopMode === "off") {
      state.loopMode = "track";
    } else if (state.loopMode === "track") {
      state.loopMode = "queue";
    } else {
      state.loopMode = "off";
    }

    return state.loopMode;
  }

  public shuffle(guildId: string) {
    const state = this.getState(guildId);

    for (let i = state.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.queue[i], state.queue[j]] = [state.queue[j], state.queue[i]];
    }
  }

  public async sendOrUpdateNowPlaying(guildId: string) {
    const state = this.getState(guildId);
    if (!state.current || !state.textChannelId) return;

    const channel = await this.client.channels.fetch(state.textChannelId).catch(() => null);
    if (!channel || !(channel instanceof TextChannel)) return;

    const embed = nowPlayingEmbed(state.current, state);
    const components = createPlayerControls();

    const message = await channel.send({
      embeds: [embed],
      components,
    });

    state.controllerMessageId = message.id;
  }
}
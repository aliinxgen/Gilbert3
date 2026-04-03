export type LoopMode = "off" | "track" | "queue";

export type TrackItem = {
  encoded: string;
  title: string;
  author: string;
  uri: string;
  length: number;
  requestedBy: string;
};

export type GuildPlayerState = {
  textChannelId: string;
  current: TrackItem | null;
  queue: TrackItem[];
  volume: number;
  loopMode: LoopMode;
  paused: boolean;
  controllerMessageId?: string;
};
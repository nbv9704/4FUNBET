// Centralized socket event names — import and reuse everywhere
export const SOCKET_EVENTS = {
  REGISTER: 'register',
  NOTIFICATION: 'notification',

  PVP: {
    ROOM_UPDATED: 'pvp:roomUpdated',
    ROOM_STARTED: 'pvp:roomStarted',
    ROOM_FINISHED: 'pvp:roomFinished',
    ROOM_DELETED: 'pvp:roomDeleted',

    JOIN_CHANNEL: 'pvp:joinRoomChannel',
    LEAVE_CHANNEL: 'pvp:leaveRoomChannel',
    LIST: 'pvp:list',
  },
};

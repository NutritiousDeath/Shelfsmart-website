const { REST, Routes } = require('discord.js');

const commands = [
  { name: 'chat', description: 'Chat with AuraAI', options: [{ name: 'message', description: 'Your message', type: 3, required: true }] },
  { name: 'stats', description: 'Look up Overwatch 2 or Marvel Rivals stats', options: [{ name: 'username', description: 'BattleTag (OW) or username (Rivals)', type: 3, required: true }] },
  { name: 'top-heroes', description: 'Top heroes this patch' },
  { name: 'ask-td', description: 'Ask the AI Tournament Director a question', options: [{ name: 'question', description: 'Your question', type: 3, required: true }] },
  { name: 'coaching-schedule', description: 'Request a coaching session', options: [{ name: 'game', description: 'Game', type: 3, required: true, choices: [{ name: 'Overwatch 2', value: 'overwatch' }, { name: 'Marvel Rivals', value: 'rivals' }, { name: 'Destiny 2', value: 'destiny' }, { name: 'Rainbow Six Siege', value: 'r6siege' }] }] },
  { name: 'coaching-end', description: 'End a coaching session and post transcript' },
  { name: 'coach-apply', description: 'Apply to become an AuraAI coach', options: [{ name: 'display_name', description: 'Your display name', type: 3, required: true }, { name: 'game', description: 'Game you coach', type: 3, required: true, choices: [{ name: 'Overwatch 2', value: 'overwatch' }, { name: 'Marvel Rivals', value: 'rivals' }, { name: 'Destiny 2', value: 'destiny' }] }, { name: 'bio', description: 'Short bio', type: 3, required: true }, { name: 'strengths', description: 'Your coaching strengths', type: 3, required: false }, { name: 'cashapp', description: 'CashApp URL', type: 3, required: false }, { name: 'stripe', description: 'Stripe payment URL', type: 3, required: false }] },
  { name: 'hitman', description: 'Activate AuraAI hidden hitman protocol', options: [{ name: 'target', description: 'The target (mention them)', type: 6, required: true }] },
  // OW2 match commands
  { name: 'ow-match-start', description: 'Start an OW2 tournament match', options: [{ name: 'team1', description: 'Team 1 name', type: 3, required: true }, { name: 'team2', description: 'Team 2 name', type: 3, required: true }, { name: 'map', description: 'Map name', type: 3, required: true, autocomplete: true }] },
  { name: 'ow-ban-hero', description: 'Ban a hero for this OW2 map', options: [{ name: 'hero', description: 'Hero to ban', type: 3, required: true, autocomplete: true }] },
  { name: 'ow-map-result', description: 'Report OW2 map result', options: [{ name: 'winner', description: 'Winning team name', type: 3, required: true }, { name: 'next_map', description: 'Next map name (optional)', type: 3, required: false, autocomplete: true }] },
  { name: 'ow-match-end', description: 'Force end an OW2 match (admin only)', options: [{ name: 'winner', description: 'Winning team name', type: 3, required: true }, { name: 'reason', description: 'Reason', type: 3, required: false }] },
  // Marvel Rivals match commands
  { name: 'rivals-match-start', description: 'Start a Marvel Rivals tournament match', options: [{ name: 'team1', description: 'Team 1 name', type: 3, required: true }, { name: 'team2', description: 'Team 2 name', type: 3, required: true }, { name: 'map', description: 'Map name', type: 3, required: true, autocomplete: true }, { name: 'best_of', description: 'Best of (3, 5, 7)', type: 4, required: false }] },
  { name: 'rivals-ban-hero', description: 'Ban a hero for this Rivals map', options: [{ name: 'hero', description: 'Hero to ban', type: 3, required: true, autocomplete: true }] },
  { name: 'rivals-map-result', description: 'Report Rivals map result', options: [{ name: 'winner', description: 'Winning team name', type: 3, required: true }, { name: 'next_map', description: 'Next map name (optional)', type: 3, required: false, autocomplete: true }] },
  { name: 'rivals-match-end', description: 'Force end a Rivals match (admin only)', options: [{ name: 'winner', description: 'Winning team name', type: 3, required: true }, { name: 'reason', description: 'Reason', type: 3, required: false }] },
  // Destiny 2 match commands
  { name: 'destiny-match-start', description: 'Start a Destiny 2 tournament match', options: [{ name: 'team1', description: 'Team 1 name', type: 3, required: true }, { name: 'team2', description: 'Team 2 name', type: 3, required: true }, { name: 'map', description: 'Map name', type: 3, required: true, autocomplete: true }] },
  { name: 'destiny-round-result', description: 'Report Destiny 2 round result', options: [{ name: 'winner', description: 'Winning team name', type: 3, required: true }] },
  { name: 'destiny-match-end', description: 'Force end a Destiny 2 match (admin only)', options: [{ name: 'winner', description: 'Winning team name', type: 3, required: true }, { name: 'reason', description: 'Reason', type: 3, required: false }] },
  { name: 'r6-match-start', description: 'Start an R6 Siege tournament match', options: [{ name: 'tournament', description: 'Tournament name', type: 3, required: true }, { name: 'team1', description: 'Team 1 name (attack first)', type: 3, required: true }, { name: 'team2', description: 'Team 2 name (defense first)', type: 3, required: true }, { name: 'map', description: 'Map name', type: 3, required: true, autocomplete: true }] },
  { name: 'ban-operator', description: 'Ban an R6 Siege operator for this round', options: [{ name: 'operator', description: 'Operator name to ban', type: 3, required: true, autocomplete: true }] },
  { name: 'r6-map-result', description: 'Report R6 round result', options: [{ name: 'winner', description: 'Winning team name', type: 3, required: true }] },
  { name: 'r6-match-end', description: 'Force end an R6 match and declare a winner (admin only)', options: [{ name: 'winner', description: 'Winning team name', type: 3, required: true }, { name: 'reason', description: 'Reason for ending early', type: 3, required: false }] },
  { name: 'match-start', description: 'Start a tournament match', options: [{ name: 'tournament', description: 'Tournament name', type: 3, required: true }, { name: 'team1', description: 'Team 1 name', type: 3, required: true }, { name: 'team2', description: 'Team 2 name', type: 3, required: true }, { name: 'lobby_team', description: 'Team setting up lobby', type: 3, required: false }, { name: 'mode_rotation', description: 'Mode rotation (comma separated)', type: 3, required: false }] },
  { name: 'ban-hero', description: 'Ban a hero for this map', options: [{ name: 'hero', description: 'Hero to ban', type: 3, required: true }] },
  { name: 'match-code', description: 'Share the match lobby code', options: [{ name: 'code', description: 'Lobby code', type: 3, required: true }] },
  { name: 'map-result', description: 'Report map winner', options: [{ name: 'winner', description: 'Winning team name', type: 3, required: true }] },
  { name: 'map-pick', description: 'Pick the next map', options: [{ name: 'map', description: 'Map name', type: 3, required: true }] },
  { name: 'register', description: 'Register yourself for a tournament', options: [{ name: 'tournament_name', description: 'Tournament name', type: 3, required: true }, { name: 'game', description: 'Game', type: 3, required: true, choices: [{ name: 'Overwatch 2', value: 'overwatch' }, { name: 'Marvel Rivals', value: 'rivals' }, { name: 'Destiny 2', value: 'destiny' }, { name: 'Rainbow Six Siege', value: 'r6siege' }] }, { name: 'game_tag', description: 'Your in-game tag or username', type: 3, required: false }] },
  { name: 'team-create', description: 'Create a team for a tournament', options: [{ name: 'team_name', description: 'Your team name', type: 3, required: true }, { name: 'tournament_name', description: 'Tournament name', type: 3, required: true }, { name: 'game', description: 'Game', type: 3, required: true, choices: [{ name: 'Overwatch 2', value: 'overwatch' }, { name: 'Marvel Rivals', value: 'rivals' }, { name: 'Destiny 2', value: 'destiny' }, { name: 'Rainbow Six Siege', value: 'r6siege' }] }] },
  { name: 'roster-add', description: 'Add a player to your team', options: [{ name: 'player', description: 'Player to add', type: 6, required: true }, { name: 'tournament_name', description: 'Tournament name', type: 3, required: true }] },
  { name: 'report-score', description: 'Report match score', options: [{ name: 'tournament_name', description: 'Tournament name', type: 3, required: true }, { name: 'your_score', description: 'Your score', type: 4, required: true }, { name: 'opponent_score', description: 'Opponent score', type: 4, required: true }] },
  { name: 'scrim-schedule', description: 'Schedule a scrim', options: [{ name: 'opponent', description: 'Opponent team', type: 3, required: true }, { name: 'date', description: 'Date and time', type: 3, required: true }] },
  { name: 'tournament-create', description: 'Create a tournament', options: [{ name: 'name', description: 'Tournament name', type: 3, required: true }, { name: 'game', description: 'Game', type: 3, required: true, choices: [{ name: 'Overwatch 2', value: 'overwatch' }, { name: 'Marvel Rivals', value: 'rivals' }, { name: 'Destiny 2', value: 'destiny' }, { name: 'Rainbow Six Siege', value: 'r6siege' }] }] },
  { name: 'tournament-end', description: 'End a tournament', options: [{ name: 'name', description: 'Tournament name', type: 3, required: true }, { name: 'game', description: 'Game', type: 3, required: true, choices: [{ name: 'Overwatch 2', value: 'overwatch' }, { name: 'Marvel Rivals', value: 'rivals' }, { name: 'Destiny 2', value: 'destiny' }, { name: 'Rainbow Six Siege', value: 'r6siege' }] }] },
  { name: 'tournament-cancel', description: 'Cancel a tournament', options: [{ name: 'name', description: 'Tournament name', type: 3, required: true }, { name: 'game', description: 'Game', type: 3, required: true, choices: [{ name: 'Overwatch 2', value: 'overwatch' }, { name: 'Marvel Rivals', value: 'rivals' }, { name: 'Destiny 2', value: 'destiny' }, { name: 'Rainbow Six Siege', value: 'r6siege' }] }] },
  { name: 'create', description: 'Create, list, or cancel an event/signup — Aura will DM you a setup menu' },
  { name: 'embed-create', description: 'Build and post a custom embed (Manage Server permission required)', default_member_permissions: '32' },
  { name: 'voice-rename', description: 'Rename your temp voice channel', options: [{ name: 'name', description: 'New channel name', type: 3, required: true }] },
  { name: 'voice-limit', description: 'Set your temp VC user limit', options: [{ name: 'limit', description: 'Limit (0-99, 0 = unlimited)', type: 4, required: true }] },
  { name: 'voice-transfer', description: 'Transfer ownership of your temp VC', options: [{ name: 'user', description: 'User to transfer ownership to', type: 6, required: true }] },
  { name: 'voice-lock', description: 'Lock your temp VC so no new members can join' },
  { name: 'voice-unlock', description: 'Unlock your temp VC' },
  { name: 'voice-kick', description: 'Kick a user from your temp VC', options: [{ name: 'user', description: 'User to kick', type: 6, required: true }] },
  { name: 'voice-invite', description: 'Let a user join your temp VC even if locked/hidden', options: [{ name: 'user', description: 'User to invite', type: 6, required: true }] },
  { name: 'voice-hide', description: 'Hide your temp VC from everyone but current members' },
  { name: 'voice-unhide', description: 'Make your temp VC visible again' },
  { name: 'voice-claim', description: 'Claim ownership of a temp VC after the owner leaves' },
  { name: 'rank', description: 'Check your or another user\'s level and XP', options: [{ name: 'user', description: 'User to check (defaults to you)', type: 6, required: false }] },
  { name: 'leaderboard', description: 'View this server\'s XP leaderboard' },
  { name: 'ban', description: 'Ban a member', default_member_permissions: '4', options: [
    { name: 'user', description: 'Member to ban', type: 6, required: true },
    { name: 'reason', description: 'Reason for the ban', type: 3, required: true },
    { name: 'purge_days', description: 'Days of their messages to delete (0-7, overrides default)', type: 4, required: false },
  ] },
  { name: 'kick', description: 'Kick a member', default_member_permissions: '2', options: [
    { name: 'user', description: 'Member to kick', type: 6, required: true },
    { name: 'reason', description: 'Reason for the kick', type: 3, required: true },
  ] },
  { name: 'mute', description: 'Mute a member using the configured Mute role', default_member_permissions: '268435456', options: [
    { name: 'user', description: 'Member to mute', type: 6, required: true },
    { name: 'reason', description: 'Reason for the mute', type: 3, required: true },
    { name: 'hours', description: 'Duration in hours (overrides default, 0 = permanent)', type: 4, required: false },
    { name: 'minutes', description: 'Duration in minutes (overrides default)', type: 4, required: false },
  ] },
  { name: 'hardmute', description: 'Mute a member and strip their other roles (restored on unmute)', default_member_permissions: '268435456', options: [
    { name: 'user', description: 'Member to hardmute', type: 6, required: true },
    { name: 'reason', description: 'Reason for the hardmute', type: 3, required: true },
    { name: 'hours', description: 'Duration in hours (overrides default, 0 = permanent)', type: 4, required: false },
    { name: 'minutes', description: 'Duration in minutes (overrides default)', type: 4, required: false },
  ] },
  { name: 'timeout', description: 'Timeout a member using Discord\'s native timeout', default_member_permissions: '1099511627776', options: [
    { name: 'user', description: 'Member to timeout', type: 6, required: true },
    { name: 'reason', description: 'Reason for the timeout', type: 3, required: true },
    { name: 'hours', description: 'Duration in hours (overrides default, max 28 days total)', type: 4, required: false },
    { name: 'minutes', description: 'Duration in minutes (overrides default)', type: 4, required: false },
  ] },
  { name: 'tempban', description: 'Temporarily ban a member — auto-unbanned after the duration', default_member_permissions: '4', options: [
    { name: 'user', description: 'Member to tempban', type: 6, required: true },
    { name: 'reason', description: 'Reason for the tempban', type: 3, required: true },
    { name: 'hours', description: 'Duration in hours (overrides default)', type: 4, required: false },
    { name: 'minutes', description: 'Duration in minutes (overrides default)', type: 4, required: false },
    { name: 'purge_days', description: 'Days of their messages to delete (0-7, overrides default)', type: 4, required: false },
  ] },
  { name: 'unmute', description: 'Remove a member\'s mute (restores roles if they were hardmuted)', default_member_permissions: '268435456', options: [
    { name: 'user', description: 'Member to unmute', type: 6, required: true },
  ] },
  { name: 'unban', description: 'Unban a user by their Discord ID', default_member_permissions: '4', options: [
    { name: 'user_id', description: 'Discord user ID to unban', type: 3, required: true },
  ] },
  { name: 'give-xp', description: 'Give XP to a member (Pro feature)', default_member_permissions: '32', options: [
    { name: 'user', description: 'Member to give XP to', type: 6, required: true },
    { name: 'amount', description: 'Amount of XP to give', type: 4, required: true },
  ] },
  { name: 'remove-xp', description: 'Remove XP from a member (Pro feature)', default_member_permissions: '32', options: [
    { name: 'user', description: 'Member to remove XP from', type: 6, required: true },
    { name: 'amount', description: 'Amount of XP to remove', type: 4, required: true },
  ] },
  { name: 'tag-create', description: 'Save a custom tag (Manage Server permission required)', default_member_permissions: '32', options: [
    { name: 'name', description: 'Tag name (lowercase, hyphens allowed)', type: 3, required: true },
    { name: 'response', description: 'What the bot should reply with', type: 3, required: true },
  ] },
  { name: 'tag', description: 'Recall a saved tag', options: [
    { name: 'name', description: 'Tag name', type: 3, required: true, autocomplete: true },
  ] },
  { name: 'tag-delete', description: 'Delete a saved tag (Manage Server permission required)', default_member_permissions: '32', options: [
    { name: 'name', description: 'Tag name', type: 3, required: true, autocomplete: true },
  ] },
  { name: 'tag-list', description: 'List all saved tags in this server' },
  { name: 'suggest', description: 'Submit a suggestion for this server', options: [
    { name: 'idea', description: 'Your suggestion', type: 3, required: true },
  ] },
  { name: 'warn', description: 'Warn a member (Pro feature)', default_member_permissions: '32', options: [
    { name: 'user', description: 'Member to warn', type: 6, required: true },
    { name: 'reason', description: 'Reason for the warning', type: 3, required: true },
  ] },
  { name: 'warnings', description: 'View a member\'s warning history (Pro feature)', default_member_permissions: '32', options: [
    { name: 'user', description: 'Member to check', type: 6, required: true },
  ] },
  // ─── TICKET SYSTEM (admin config — Manage Server required) ────────────────
  { name: 'ticket-setup', description: 'Configure the ticket system for this server', default_member_permissions: '32', options: [
    { name: 'channel', description: 'Channel where the ticket panel + threads live', type: 7, required: true },
    { name: 'support_role', description: 'Role that can see/claim/close every ticket', type: 8, required: true },
    { name: 'log_channel', description: 'Channel to post transcripts of closed tickets', type: 7, required: false },
  ] },
  { name: 'ticket-category-add', description: 'Add a ticket category/type', default_member_permissions: '32', options: [
    { name: 'label', description: 'Category name (e.g. "Bug Report", "General Support")', type: 3, required: true },
    { name: 'emoji', description: 'Emoji for the button/dropdown option', type: 3, required: false },
    { name: 'style', description: 'Button color (ignored once 2+ categories exist and it becomes a dropdown)', type: 3, required: false, choices: [{ name: 'Blurple', value: 'blurple' }, { name: 'Grey', value: 'grey' }, { name: 'Green', value: 'green' }, { name: 'Red', value: 'red' }] },
    { name: 'question1', description: 'Optional modal question #1 (asked when a user opens this ticket type)', type: 3, required: false },
    { name: 'question2', description: 'Optional modal question #2', type: 3, required: false },
    { name: 'question3', description: 'Optional modal question #3', type: 3, required: false },
  ] },
  { name: 'ticket-category-remove', description: 'Remove a ticket category by its label', default_member_permissions: '32', options: [
    { name: 'label', description: 'Exact category label to remove', type: 3, required: true },
  ] },
  { name: 'ticket-category-list', description: 'List all configured ticket categories', default_member_permissions: '32' },
  { name: 'ticket-panel-post', description: 'Post (or refresh) the ticket panel in the configured channel', default_member_permissions: '32' },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands globally...');
    await rest.put(Routes.applicationCommands('1479991514351538350'), { body: commands });
    console.log('Successfully registered globally!');

    console.log('Registering slash commands to main server...');
    await rest.put(Routes.applicationGuildCommands('1479991514351538350', '542092160724369442'), { body: commands });
    console.log('Successfully registered to main server!');
  } catch (err) {
    console.error('Error registering commands:', err);
  }
})();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const RSSParser = require('rss-parser');

const parser = new RSSParser();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const dbPath = path.join(__dirname, 'data.json');

client.commands = new Collection();
client.cooldowns = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);

    if (!fs.lstatSync(commandsPath).isDirectory()) {
        continue;
    }

	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

async function checkYouTube() {
	if (!fs.existsSync(dbPath)) return;
	const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
	let dataChanged = false;

	for (const guildId in db) {
		const channelsToWatch = db[guildId];
		for (const entry of channelsToWatch) {
			try {
				const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${entry.ytId}`);
				if (!feed || !feed.items || feed.items.length === 0) continue;
				const latestVideo = feed.items[0];
				if (entry.lastVideoId !== latestVideo.id) {
					if (entry.lastVideoId !== null) {
						const discordChannel = await client.channels.fetch(entry.discordChannelId).catch(() => null);
						if (discordChannel) {
							await discordChannel.send(`🚨 **New Upload!** ${feed.title}\n${latestVideo.link}\n@everyone`);
						}
					}
					entry.lastVideoId = latestVideo.id;
					dataChanged = true;
				}
			} catch (error) {
				console.error(`Error checking ${entry.ytId}:`, error.message);
			}
		}
	}
	if (dataChanged) {
		fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
	}
}

client.once('ready', () => {
	console.log('Youtube Watcher Started...');
	checkYouTube();
	setInterval(checkYouTube, 300_000);
});

client.login(token);
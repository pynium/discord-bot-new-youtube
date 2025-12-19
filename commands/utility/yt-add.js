const { SlashCommandBuilder, ChannelType } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const RSSParser = require('rss-parser');

const dbPath = path.join(__dirname, '..', '..', 'data.json');
const parser = new RSSParser();

/**
 * Fetches a YouTube URL and scrapes the Channel ID from the page's HTML content.
 * This version is more robust and checks for multiple patterns.
 * @param {string} url The YouTube URL to check.
 * @returns {Promise<string|null>} The channel ID (UC...) or null if not found.
 */
async function getChannelIdFromUrl(url) {
    try {
        const response = await fetch(url, {
            // Some sites serve different content based on the user-agent. This mimics a browser.
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        if (!response.ok) return null;

        const html = await response.text();

        // Pattern 1: Look for the ID inside a script tag or JSON data (most reliable).
        // Example: "channelId":"UC..."
        let match = html.match(/"channelId":"(UC[\w-]{22})"/);
        if (match && match[1]) {
            return match[1];
        }

        // Pattern 2: Fallback to the canonical URL link tag.
        // Example: <link rel="canonical" href="https://www.youtube.com/channel/UC...">
        match = html.match(/<link rel="canonical" href="https:\/\/www.youtube.com\/channel\/(UC[\w-]{22})">/);
        if (match && match[1]) {
            return match[1];
        }

        // If neither pattern worked, we can't find the ID.
        return null;
    } catch (error) {
        console.error('Failed to fetch or parse YouTube URL:', error);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yt-add')
        .setDescription('Add a YouTube channel to watch (Max 5 per server).')
        .addStringOption(option =>
            option.setName('link')
                .setDescription('The URL to the YouTube channel (e.g., /@handle, /channel/...).')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Which Discord channel to post in?')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        const ytLink = interaction.options.getString('link');
        const targetChannel = interaction.options.getChannel('channel');

        const ytChannelId = await getChannelIdFromUrl(ytLink);

        if (!ytChannelId) {
            return interaction.editReply('❌ Invalid or unreachable YouTube channel link. I could not find a Channel ID from that URL.');
        }

        let channelName = 'Unknown Channel';
        try {
            const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${ytChannelId}`);
            channelName = feed.title;
        } catch (error) {
            return interaction.editReply('❌ I could not find an RSS feed for that YouTube channel! Please check the link.');
        }

        let db;
        try {
            db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        } catch (err) {
            db = {};
        }
        
        const guildId = interaction.guild.id;
        if (!db[guildId]) db[guildId] = [];

        if (db[guildId].length >= 5) {
            return interaction.editReply('❌ Limit reached! You can only have 5 watched channels.');
        }

        const exists = db[guildId].find(entry => entry.ytId === ytChannelId);
        if (exists) {
            return interaction.editReply('❌ This YouTube channel is already being watched!');
        }

        db[guildId].push({
            ytId: ytChannelId,
            ytName: channelName,
            discordChannelId: targetChannel.id,
            lastVideoId: null
        });

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

        await interaction.editReply(`✅ Added **${channelName}**! I will post updates in ${targetChannel}.`);
    },
};
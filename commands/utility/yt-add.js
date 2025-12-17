const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const RSSParser = require('rss-parser');

const dbPath = path.join(__dirname, '..', '..', 'data.json');
const parser = new RSSParser();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yt-add')
        .setDescription('Add a YouTube channel to watch (Max 5 per server).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('link')
                .setDescription('The LINK to the YouTube channel (Must be the /channel/UC... link!)')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Which Discord channel to post in?')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const ytLink = interaction.options.getString('link');
        const targetChannel = interaction.options.getChannel('channel');

        const idRegex = /channel\/(UC[\w-]{21}[AQgw])/;
        const match = ytLink.match(idRegex);

        if (!match) {
            return interaction.editReply('❌ Invalid Link! I need the link that looks like `youtube.com/channel/UC...`');
        }
        const ytChannelId = match[1];

        let channelName = 'Unknown Channel';
        try {
            const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${ytChannelId}`);
            channelName = feed.title;
        } catch (error) {
            return interaction.editReply('❌ I could not find that YouTube channel! Please check the link.');
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
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = path.join(__dirname, '..', '..', 'data.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yt-list')
        .setDescription('Show all watched YouTube channels'),
    
    async execute(interaction) {
        let db;
        try {
            db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        } catch (error) {
            return interaction.reply({ content: '❌ Database error.' });
        }

        const guildId = interaction.guild.id;
        const serverList = db[guildId]; 

        if (!serverList || serverList.length === 0) {
            return interaction.reply({ content: '📭 No YouTube channels are being watched.' });
        }

        const serverIcon = interaction.guild.iconURL({ dynamic: true });

        const listDescription = serverList.map((entry, index) => {
            const name = entry.ytName || 'Unknown Name (Remove and re-add)';
            const channelLink = `https://www.youtube.com/channel/${entry.ytId}`;
            return `**${index + 1}.** [${name}](${channelLink}) — <#${entry.discordChannelId}>`;}).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('📺 YT Update Links')
            .setThumbnail(serverIcon)
            .setDescription(listDescription)
            .setFooter({ text: `Total Channels: ${serverList.length}/5` });

        await interaction.reply({ embeds: [embed] });
    }
};
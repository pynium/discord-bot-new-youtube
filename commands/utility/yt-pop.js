const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const dbPath = path.join(__dirname, '..', '..', 'data.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yt-remove')
        .setDescription('Remove a YouTube channel from the watch list.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option =>
            option.setName('index')
                .setDescription('The number of the channel to remove (Look at /yt-list)')
                .setRequired(true)),

    async execute(interaction) {
        const indexToRemove = interaction.options.getInteger('index');
        const guildId = interaction.guild.id;

        let db;
        try {
            db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        } catch (error) {
            return interaction.reply({ content: '❌ Database error.', ephemeral: true });
        }

        const serverList = db[guildId];

        if (!serverList || serverList.length === 0) {
            return interaction.reply({ content: '❌ There are no channels to remove!', ephemeral: true });
        }

        if (indexToRemove < 1 || indexToRemove > serverList.length) {
            return interaction.reply({ content: `❌ Invalid number! Please choose a number between **1** and **${serverList.length}**.\n(Use \`/yt-list\` to check)`, ephemeral: true });
        }

        const removedItem = serverList.splice(indexToRemove -1, 1)[0];
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        const name = removedItem.ytName || 'Unknown Channel';
        await interaction.reply(`✅ Successfully removed **${name}** (Index ${indexToRemove}) from the list.`);
    },
};
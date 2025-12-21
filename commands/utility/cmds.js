const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cmds')
        .setDescription('Displays a list of all available commands.'),

    async execute(interaction) {
        const commandsPath = path.join(__dirname, '..'); 
        const commandFolders = fs.readdirSync(commandsPath);
        const folderEmojis = {
            'fun': '🎮',
            'moderation': '🛡️',
            'utility': '🛠️'
        };

        const hiddenFiles = ['crit.js', 'soft.js'];

        const embed = new EmbedBuilder()
            .setTitle('📜 Bot Commands')
            .setDescription('Here are the available commands for this server.')
            .setColor(0x00AAFF)
            .setThumbnail(interaction.client.user.displayAvatarURL());

        // 5. Loop through folders to build the grid
        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);

            // Skip if it's not a folder (like .DS_Store or files in the root commands folder)
            if (!fs.lstatSync(folderPath).isDirectory()) continue;

            // Get all .js files in that folder
            const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

            // FILTERING LOGIC: Remove the hidden files
            const visibleCommands = files.filter(file => !hiddenFiles.includes(file));

            // If a folder is empty after filtering, skip it
            if (visibleCommands.length === 0) continue;

            // Create a pretty list: "`ping`, `echo`, `dog`"
            const commandString = visibleCommands.map(file => {
                const commandName = file.replace('.js', ''); // Remove .js from name
                return `\`/${commandName}\``;
            }).join(', ');

            // Get the emoji (or use a folder icon if missing)
            const emoji = folderEmojis[folder.toLowerCase()] || '📂';
            
            // Capitalize the folder name (utility -> Utility)
            const categoryName = folder.charAt(0).toUpperCase() + folder.slice(1);

            // ADD THE FIELD (inline: true makes it a grid!)
            embed.addFields({
                name: `${emoji} ${categoryName}`,
                value: commandString,
                inline: true 
            });
        }

        await interaction.reply({ embeds: [embed] });
    },
};
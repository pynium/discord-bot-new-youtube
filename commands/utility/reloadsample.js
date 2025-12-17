const { SlashCommandBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reloadsample')
        .setDescription('Reloads a command.')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command to reload.')
                .setRequired(true)
        ),
    async execute(interaction) {
        const commandName = interaction.options.getString('command', true).toLowerCase();
        const command = interaction.client.commands.get(commandName);

        if (!command) {
            return interaction.reply(`There is no command with name \`${commandName}\`!`);
        }

        // 1. We are in 'commands/utilities/', so we go up '..' to get to 'commands/'
        const commandsFolder = path.join(__dirname, '..');
        const folders = fs.readdirSync(commandsFolder);

        let commandPath = null;

        // 2. Search through 'utilities', 'moderation', 'fun', etc. to find the file
        for (const folder of folders) {
            const potentialPath = path.join(commandsFolder, folder, `${command.data.name}.js`);
            if (fs.existsSync(potentialPath)) {
                commandPath = potentialPath;
                break; 
            }
        }

        if (!commandPath) {
            return interaction.reply(`Could not find the file for \`${commandName}\`.`);
        }

        // 3. Clear the cache and reload using the path we found
        delete require.cache[require.resolve(commandPath)];

        try {
            const newCommand = require(commandPath);
            interaction.client.commands.set(newCommand.data.name, newCommand);
            await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded!`);
        } catch (error) {
            console.error(error);
            await interaction.reply(
                `There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``
            );
        }
    },
};
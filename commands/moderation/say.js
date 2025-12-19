const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Makes the bot say a message.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The message you want the bot to say')
                .setRequired(true)
        ),

    async execute(interaction) {
        const textToSay = interaction.options.getString('message');
        await interaction.channel.send(textToSay);

        await interaction.reply({ content: '✅ Message sent anonymously.', ephemeral: true });
    },
};
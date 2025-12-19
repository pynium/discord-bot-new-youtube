const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute member from server for limited/unlimited duration.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Manage)
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
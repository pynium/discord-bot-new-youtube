const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prune')
        .setDescription('Prune a certain number of messages (up to 99).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete')
                .setMinValue(1)
                .setMaxValue(99)
                .setRequired(true)),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        try {
            const deletedMessages = await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({ content: `Successfully pruned \`${deletedMessages.size}\` messages.`, ephemeral: true});
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error trying to prune messages in this channel! (Messages older than 14 days cannot be bulk deleted).', ephemeral: true });
        }
    },
};
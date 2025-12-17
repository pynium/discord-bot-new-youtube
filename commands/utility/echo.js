const { SlashCommandBuilder, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('echo')
        .setDescription('Replies with your input!')
        .addStringOption((option) =>
            option
                .setName('input')
                .setDescription('The input to echo back')
                .setMaxLength(2_000)
                .setRequired(true)
        )
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to echo into')
                .addChannelTypes(ChannelType.GuildText),
        )
        .addBooleanOption((option) => 
            option.setName('embed').setDescription('Whether or not the echo should be embedded')
        ),

    async execute(interaction) {
        const input = interaction.options.getString('input');
        const targetChannel = interaction.options.getChannel('channel');
        const shouldEmbed = interaction.options.getBoolean('embed');

        let messagePayload;

        if (shouldEmbed) {
            const embed = new EmbedBuilder()
                .setDescription(input)
                .setColor(0x0099FF);
            messagePayload = { embeds: [embed] };
        } else {
            messagePayload = { content: input };
        }

        if (targetChannel) {
            await targetChannel.send(messagePayload);
            await interaction.reply({ 
                content: `Successfully sent message to ${targetChannel}!`, 
                flags: MessageFlags.Ephemeral 
            });
        } else {
            await interaction.reply(messagePayload);
        }
    },
};
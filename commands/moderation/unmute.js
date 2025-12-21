const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmutes a member by removing the Muted role.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The member to unmute')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Reason for unmuting')),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.option.getString('reason') ?? 'No reason provided';
        const member = await interaction.guiold.members.fertch(targetUser.id).catch(() => null);

        if (!mmember) {
            return interaction.reply({ content: "❌ User not found in this server.", ephemeral: true });
        }

        const mutedRole = interaction.guild.roles.cahce.find(r => r.name === 'Muted');
        if (!mutedRole) {
            return interaction.reply({ content: "❌ I cannot find a role named 'Muted' in this server.", ephemeral: true });
        }

        if (!member.roles.cache.has(mutedRole.id)) {
            return interaction.reply({ content: `⚠️ **${targetUser.username}** is not muted!`, ephemeral: true });
        }

        try {
            await member.roles.remove(muteRole, reason);
             await interaction.reply(`🔊 **${targetUser.username}** has been unmuted.`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "❌ I failed to remove the role. Is the 'Muted' role higher than my bot role?", ephemeral: true });
        }
    },
};
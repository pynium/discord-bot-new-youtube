const { SlashCommandBuilder, PermissionFlagsBits, PermissionOverwrites } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mutes a user via Role (Indefinite if no time is set).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The member to mute')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Reason for the mute'))
        .addIntegerOption(option => 
            option.setName('duration')
                .setDescription('Optional: How long?'))
        .addStringOption(option => 
            option.setName('unit')
                .setDescription('Optional: Time unit')
                .addChoices(
                    { name: 'Minutes', value: 'minutes' },
                    { name: 'Hours', value: 'hours' },
                    { name: 'Days', value: 'days' }
                )),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const duration = interaction.options.getInteger('duration');
        const unit = interaction.options.getString('unit');
        const guild = interaction.guild;
        
        await interaction.deferReply();

        // 1. Fetch the Member
        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) return interaction.reply({ content: "❌ User not found.", ephemeral: true });
        if (member.id === interaction.user.id) return interaction.reply({ content: "❌ You cannot mute yourself.", ephemeral: true });
        if (!member.moderatable) return interaction.reply({ content: "❌ I cannot mute this user (they are higher than me).", ephemeral: true });
        
        let mutedRole = guild.cache.find(r => r.name === 'Muted');
        if (!mutedRole) {
            try{
                // CREATE ROLE
                mutedRole = await guild.roles.create({
                    name: 'Muted',
                    color: '#545454',
                    reason: 'Mute command setup',
                    permissions: []
                });
                // SETUP CHANNEL PERMISSIONS
                interaction.channel.send('⚙️ First time setup: Configuring channel permissions for "Muted" role...')

                guild.channels.cache.forEach(async (channel) => {
                    if (channel.isThread()) return;
                    await channel.PermissionOverwrites.edit(mutedRole, {
                        SendMessages: false,
                        AddReactions: false,
                        Speak: false,
                        Connect: false,
                    }).catch(() => {});
                });
            } catch (error) {
                console.error(error);
                return interaction.reply("❌ Failed to create/setup the Muted role. Do I have 'Manage Roles' permission?")
            }
        }
        if (member.roles.cahce.has(mutedRole.id)) {
            return interaction.editReply("⚠️ That user is already muted!")
        }

        await member.roles.add(mutedRole, reason);
        if (durration && unit) {
            let timeInMs = 0;
            switch (unit) {
                case 'minutes': timeInMs = duration * 60 * 1000; break;
                case 'hours':   timeInMs = duration * 60 * 60 * 1000; break;
                case 'days':    timeInMs = duration * 24 * 60 * 60 * 1000; break;
            }

            const finishTime = Math.floor((Date.now() + timeInMs) / 1000);

            await interaction.editReply(`⏳ **${targetUser.username}** muted for **${duration} ${unit}**.\nUnmutes <t:${finishTime}:R>. (Dark Grey Role applied)`);
            setTimeout(async () => {
                // Check if they still have the role (maybe someone unmuted them early)
                if (member.roles.cache.has(mutedRole.id)) {
                    await member.roles.remove(mutedRole);
                    console.log(`Auto-unmuted ${targetUser.username}`);
                }
            }, timeInMs);

        } else {
            // If NO time provided, it is FOREVER
            await interaction.editReply(`🤐 **${targetUser.username}** has been muted **Indefinitely**.\n(Dark Grey Role applied)`);
        }
    },
};
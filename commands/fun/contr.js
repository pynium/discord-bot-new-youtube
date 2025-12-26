const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('contr')
        .setDescription('Get a link to the best counters for a champion')
        .addStringOption(option =>
            option.setName('lane')
                .setDescription('The lane/role to check')
                .setRequired(true)
                .addChoices(
                    { name: 'Top', value: 'top' },
                    { name: 'Jungle', value: 'jungle' },
                    { name: 'Mid', value: 'middle' }, // U.GG URL uses 'middle'
                    { name: 'ADC', value: 'adc' },
                    { name: 'Support', value: 'support' }
                )
        )
        .addStringOption(option =>
            option.setName('champion')
                .setDescription('The enemy champion name')
                .setRequired(true)
        ),
    async execute(interaction) {
        const role = interaction.options.getString('lane');
        const rawName = interaction.options.getString('champion');

        // 1. Sanitize Name for U.GG URL (lowercase, no spaces/chars)
        let cleanName = rawName.toLowerCase().replace(/[^a-z]/g, '');

        // 2. Handle Edge Cases for U.GG URL generation
        // U.GG slugs often differ slightly from user input or Riot API
        const edgeCases = {
            'wukong': 'wukong',         
            'nunu': 'nunu',             
            'nunuwillump': 'nunu',
            'renata': 'renata',
            'renataglasc': 'renata',
            'drmundo': 'drmundo',
            'jarvaniv': 'jarvaniv',
            'kogmaw': 'kogmaw',
            'reksai': 'reksai',
            'belveth': 'belveth',
            'ksante': 'ksante'
        };
        if (edgeCases[cleanName]) cleanName = edgeCases[cleanName];

        // 3. Construct the U.GG URL
        const url = `https://u.gg/lol/champions/${cleanName}/counter?rank=overall&role=${role}`;

        // 4. Handle Image Name (Riot API is strict about capitalization)
        // Most names just need to be Capitalized (e.g. "Draven"), but some are special.
        let imageName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        
        // Fix specific image names for Riot's CDN
        if (cleanName === 'wukong') imageName = 'MonkeyKing'; // Riot uses MonkeyKing, U.GG uses wukong
        if (cleanName === 'drmundo') imageName = 'DrMundo';
        if (cleanName === 'jarvaniv') imageName = 'JarvanIV';
        if (cleanName === 'kogmaw') imageName = 'KogMaw';
        if (cleanName === 'reksai') imageName = 'RekSai';
        if (cleanName === 'nunu') imageName = 'Nunu'; // Nunu usually works, sometimes Nunu&Willump
        if (cleanName === 'renata') imageName = 'Renata';

        try {
            // 5. Get Latest LoL Version for the image
            // We fetch this so the icon is always high-res and up to date
            const versionRes = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
            const latestVersion = versionRes.data[0];

            // 6. Build the Embed
            const embed = new EmbedBuilder()
                .setTitle(`⚔️ Counters vs ${rawName.charAt(0).toUpperCase() + rawName.slice(1)} (${role.charAt(0).toUpperCase() + role.slice(1)})`)
                .setURL(url)
                .setColor('#3273FA') // U.GG Blue
                .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${imageName}.png`)
                .setDescription(`**[Click here to view winrates and counters on U.GG](${url})**`)
                .setFooter({ text: 'Link to U.GG' });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            // Even if the version fetch fails, we send the link, just without the updated image version
            const fallbackEmbed = new EmbedBuilder()
                .setTitle(`⚔️ Counters vs ${rawName}`)
                .setURL(url)
                .setColor('#3273FA')
                .setDescription(`**[Click here to view counters on U.GG](${url})**`);
            
            await interaction.reply({ embeds: [fallbackEmbed] });
        }
    }
};
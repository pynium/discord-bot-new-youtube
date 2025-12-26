const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

let termCache = [];
let lastFetch = 0;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lol')
        .setDescription('Search League of Legends terminology from the Wiki (Ctrl + F style)')
        .addStringOption(option =>
            option.setName('query')
            .setDescription('The word or phrase to search for')
            .setRequired(true)),
    
    async execute(interaction) {
        await interaction.deferReply();

        const query = interaction.options.getString('query');
        const url = 'https://leagueoflegends.fandom.com/wiki/Terminology_(League_of_Legends)';
        const iconUrl = 'https://static.wikia.nocookie.net/leagueoflegends/images/e/e6/Site-logo.png/revision/latest?cb=20241207050418';

        if (Date.now() - lastFetch > 3600 * 1000 || termCache.length === 0) {
            try {
                const response = await axios.get(url);
                const $ = cheerio.load(response.data);

                termCache = [];

                $('dl').each((i, dl) => {
                    let pendingTerms = [];
                    let pendingDefParts = [];

                    const saveCurrentBatch = () => {
                        if (pendingTerms.length > 0 && pendingDefParts.length > 0) {
                            const fullDef = pendingDefParts.join('\n\n');
                            pendingTerms.forEach(t => {termCache.push({ term: t, definition: fullDef });});
                        }
                    };

                    $(dl).children().each((j, el) => {
                        const tag = el.tagName;
                        const text = $(el).text().trim();

                        if (tag === 'dt') {
                            if (pendingDefParts.length > 0) {
                                saveCurrentBatch();
                                pendingTerms = [];
                                pendingDefParts = [];
                            }
                            if (text) pendingTerms.push(text);
                        } else if (tag === 'dd') {
                            if (text) pendingDefParts.push(text);
                        }
                    });

                    saveCurrentBatch();
                });

                lastFetch = Date.now();
                console.log(`Updated cache with ${termCache.length} terms.`);
            } catch (error) {
                console.error(error);
                return interaction.editReply('❌ I could not connect to the LoL Wiki right now.');
            }
        }

        const filteredTerms = termCache.filter(item =>
            item.term.toLowerCase().includes(query)
        );

        if (filteredTerms.length === 0) {
            return interaction.editReply(`❌ No terms found matching **"${query}"**.`)
        }

        const RESULTS_PER_PAGE = 5;
        const totalPages = Math.ceil(filteredTerms.length / RESULTS_PER_PAGE);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * RESULTS_PER_PAGE;
            const end = start + RESULTS_PER_PAGE;
            const currentItems = filteredTerms.slice(start, end);
            const description = currentItems.map(item => {
                const cleanDef = item.definition;
                return `### ${item.term}\n${cleanDef}`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setTitle(`League Terminology: "${query}"`)
                .setURL(url)
                .setColor('#CBAD77')
                .setThumbnail(iconUrl)
                .setDescription(description)
                .setFooter({ text: `Page ${page + 1} of ${totalPages} | Found ${filteredTerms.length} results`, iconURL: iconUrl });
            
            return embed;
        };

        const generateButtons = (page) => {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages - 1)
                );
            return row;
        };

        const initialEmbed = generateEmbed(currentPage);
        const initialButtons = generateButtons(currentPage);
        const response = await interaction.editReply({ embeds: [initialEmbed], components: totalPages > 1 ? [initialButtons] : [] })

        if (totalPages === 1) return;

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: '❌ These buttons are not for you!', ephemeral: true });
            }

            if (i.customId === 'prev') {
                currentPage--;
            } else if (i.customId === 'next') {
                currentPage++;
            }

            await i.update({ embeds: [generateEmbed(currentPage)], components: [generateButtons(currentPage)] });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('prev').setLabel('◀️ Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Secondary).setDisabled(true));
            
                    interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    },
};
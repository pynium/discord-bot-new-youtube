const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dog')
        .setNameLocalizations({
            pl: 'pies',
            de: 'hund',
        })
        .setDescription('Get a cute picture of a dog!')
        .setDescriptionLocalizations({
            pl: 'Słodkie zdjęcie pieska!',
            de: 'Poste ein niedliches Hundebild!',
        })
        .addStringOption((option) =>
            option
                .setName('breed')
                .setDescription('Breed of dog')
                .setNameLocalizations({
                    pl: 'rasa',
                    de: 'rasse',
                })
                .setDescriptionLocalizations({
                    pl: 'Rasa psa',
                    de: 'Hunderasse',
                }),
        ),

    async execute(interaction) {
        const breed = interaction.options.getString('breed');

        if (breed) {
            await interaction.reply(`Woof! Here is a picture of a **${breed}**! 🐶`);
        } else {
            await interaction.reply('Woof! Here is a random dog! 🐶');
        }
    },
};
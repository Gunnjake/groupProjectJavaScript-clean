async function fixEventOccurrenceSequence(knex) {
    try {
        await knex.raw(`
            SELECT setval(
                pg_get_serial_sequence('eventoccurrences', 'eventoccurrenceid'),
                COALESCE((SELECT MAX(eventoccurrenceid) FROM eventoccurrences), 0) + 1,
                false
            );
        `);
        console.log('✓ EventOccurrence sequence fixed');
    } catch (error) {
        console.error('⚠ Error fixing EventOccurrence sequence:', error.message);
    }
}

async function fixEventTemplateSequence(knex) {
    try {
        await knex.raw(`
            SELECT setval(
                pg_get_serial_sequence('eventtemplate', 'eventtemplateid'),
                COALESCE((SELECT MAX(eventtemplateid) FROM eventtemplate), 0) + 1,
                false
            );
        `);
        console.log('✓ EventTemplate sequence fixed');
    } catch (error) {
        console.error('⚠ Error fixing EventTemplate sequence:', error.message);
    }
}

async function fixAllSequences(knex) {
    await fixEventTemplateSequence(knex);
    await fixEventOccurrenceSequence(knex);
}

module.exports = { fixEventOccurrenceSequence, fixEventTemplateSequence, fixAllSequences };



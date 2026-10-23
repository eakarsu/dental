import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { recallSections, scheduleSections, sectionsText, runGroundedAi } from '../../lib/grounded-ai';

describe('dental grounded AI (wave 14A)', () => {
  it('recall sections preserve zero counts, false insurance and empty notes', () => {
    const sections = recallSections({
      firstName: 'Ana', lastName: 'Lee', completedVisits: 0, upcomingAppointments: 0,
      plannedTreatments: 0, completedTreatments: 0, hasInsuranceOnFile: false, notes: '',
    });
    const byLabel = Object.fromEntries(sections.map((s) => [s.label, s.value]));
    assert.equal(byLabel['Completed visits'], 0);
    assert.equal(byLabel['Insurance on file'], false);
    assert.equal(byLabel['Notes'], '');
    assert.match(String(byLabel['Staff check']), /no diagnosis/);
    assert.match(sectionsText(sections), /Completed visits: 0/);
  });

  it('schedule sections preserve null next appointment', () => {
    const sections = scheduleSections({
      firstName: 'Bo', lastName: 'Ray', nextAppointmentType: null, nextAppointmentAt: null,
      openTasks: 0, hasInsuranceOnFile: false,
    });
    const byLabel = Object.fromEntries(sections.map((s) => [s.label, s.value]));
    assert.equal(byLabel['Next appointment type'], null);
    assert.match(sectionsText(sections), /Next appointment type: Not supplied/);
  });

  it('without a provider key the fallback is labelled aiGenerated:false', async () => {
    const sections = recallSections({
      firstName: 'Ana', lastName: 'Lee', completedVisits: 1, upcomingAppointments: 0,
      plannedTreatments: 0, completedTreatments: 1, hasInsuranceOnFile: true, notes: null,
    });
    const result = await runGroundedAi('prompt', sections, fetch, { NODE_ENV: 'test' });
    assert.equal(result.aiGenerated, false);
    assert.equal(result.source, 'deterministic-fallback');
    assert.match(result.label || '', /no AI provider configured/);
  });
});

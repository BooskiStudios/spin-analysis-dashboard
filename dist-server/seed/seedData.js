function createEvents(duration, cascades, bonusTriggered) {
    const events = [{ type: 'spin_start', time: 0 }];
    for (let index = 0; index < cascades; index += 1) {
        const time = Number((((index + 1) / (cascades + 1)) * Math.max(duration - 1, 1)).toFixed(2));
        events.push({ type: 'cascade', time });
    }
    if (bonusTriggered) {
        events.push({ type: 'bonus_trigger', time: Number((duration * 0.72).toFixed(2)) });
    }
    events.push({ type: 'spin_end', time: duration });
    return events;
}
function createSpin(spinNumber, winAmount, cascades, bonusTriggered, duration) {
    return {
        spinNumber,
        winAmount,
        cascades,
        bonusTriggered,
        duration,
        events: createEvents(duration, cascades, bonusTriggered),
    };
}
export const seedGames = [
    {
        name: 'Gates of Olympus',
        provider: 'Pragmatic Play',
        sessions: [
            {
                totalSpins: 184,
                rtp: 97.8,
                createdAt: '2026-03-01 10:15:00',
                spins: [
                    createSpin(1, 0, 0, false, 4.1),
                    createSpin(2, 24.5, 2, false, 4.6),
                    createSpin(3, 0, 0, false, 4.0),
                    createSpin(4, 18.2, 1, false, 4.3),
                    createSpin(5, 0, 0, true, 4.9),
                    createSpin(6, 316.8, 5, false, 5.0),
                ],
            },
            {
                totalSpins: 96,
                rtp: 88.4,
                createdAt: '2026-03-02 14:05:00',
                spins: [
                    createSpin(1, 8.4, 1, false, 4.2),
                    createSpin(2, 0, 0, false, 4.0),
                    createSpin(3, 12, 1, false, 4.3),
                    createSpin(4, 122.6, 3, false, 4.8),
                    createSpin(5, 5.6, 1, false, 4.1),
                    createSpin(6, 0, 0, false, 4.0),
                ],
            },
            {
                totalSpins: 211,
                rtp: 104.2,
                createdAt: '2026-03-05 18:40:00',
                spins: [
                    createSpin(1, 0, 0, false, 4.0),
                    createSpin(2, 32, 2, false, 4.5),
                    createSpin(3, 0, 0, false, 4.0),
                    createSpin(4, 76.4, 3, false, 4.8),
                    createSpin(5, 0, 0, true, 4.9),
                    createSpin(6, 640, 6, false, 5.0),
                ],
            },
        ],
    },
    {
        name: 'Big Bass Bonanza',
        provider: 'Pragmatic Play',
        sessions: [
            {
                totalSpins: 143,
                rtp: 92.1,
                createdAt: '2026-02-28 09:20:00',
                spins: [
                    createSpin(1, 0, 0, false, 4.0),
                    createSpin(2, 12, 1, false, 4.2),
                    createSpin(3, 54, 2, false, 4.5),
                    createSpin(4, 0, 0, false, 4.0),
                    createSpin(5, 24, 1, false, 4.3),
                    createSpin(6, 210.25, 4, false, 4.9),
                ],
            },
            {
                totalSpins: 87,
                rtp: 109.6,
                createdAt: '2026-03-04 16:10:00',
                spins: [
                    createSpin(1, 0, 0, false, 4.0),
                    createSpin(2, 18, 1, false, 4.2),
                    createSpin(3, 0, 0, true, 4.9),
                    createSpin(4, 46.5, 2, false, 4.5),
                    createSpin(5, 88.4, 3, false, 4.8),
                    createSpin(6, 488.3, 5, false, 5.0),
                ],
            },
        ],
    },
    {
        name: "Fishin' Frenzy Megaways",
        provider: 'Blueprint Gaming',
        sessions: [
            {
                totalSpins: 126,
                rtp: 95.5,
                createdAt: '2026-02-25 11:45:00',
                spins: [
                    createSpin(1, 6.2, 1, false, 4.2),
                    createSpin(2, 0, 0, false, 4.0),
                    createSpin(3, 22.8, 2, false, 4.4),
                    createSpin(4, 0, 0, false, 4.0),
                    createSpin(5, 138, 3, false, 4.8),
                    createSpin(6, 16.4, 1, false, 4.2),
                ],
            },
            {
                totalSpins: 203,
                rtp: 101.3,
                createdAt: '2026-03-06 20:00:00',
                spins: [
                    createSpin(1, 0, 0, false, 4.0),
                    createSpin(2, 18.2, 1, false, 4.2),
                    createSpin(3, 0, 0, true, 4.9),
                    createSpin(4, 64.8, 2, false, 4.5),
                    createSpin(5, 118.7, 3, false, 4.8),
                    createSpin(6, 522.75, 4, false, 5.0),
                ],
            },
        ],
    },
];

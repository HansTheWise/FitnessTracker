// This service provides pure functions for calculating dashboard data.
// It relies on date-fns for robust date manipulation. A real project
// should include it via npm/yarn, but here we assume it's globally available.
// A simple date-fns build can be included via: <script src="https://cdn.jsdelivr.net/npm/date-fns@2.28.0/cdn.min.js"></script>

function _getTimePeriod(periodStr) {
    const today = new Date();
    let start, end, labels = [];

    switch (periodStr) {
        case 'day':
            start = new Date(today.setHours(0, 0, 0, 0));
            end = new Date(today.setHours(23, 59, 59, 999));
            labels = ['Heute'];
            break;
        case 'week':
            // Assuming week starts on Monday
            const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
            const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            start = new Date(new Date(today.setDate(diff)).setHours(0, 0, 0, 0));
            end = new Date(new Date(start).setDate(start.getDate() + 6));
            end.setHours(23, 59, 59, 999);
            labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
            break;
        case 'month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            labels = Array.from({ length: end.getDate() }, (_, i) => i + 1);
            break;
        case 'year':
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
            labels = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
            break;
        default:
            return { start: null, end: null, labels: [] };
    }
    return { start, end, labels };
}

function _calculateBMR(profile) {
    if (!profile || !profile.gender || !profile.age || !profile.height_cm || !profile.weight_kg) {
        return 0;
    }
    if (profile.gender.toLowerCase() === 'female') {
        return 655.1 + (9.6 * profile.weight_kg) + (1.8 * profile.height_cm) - (4.7 * profile.age);
    }
    if (profile.gender.toLowerCase() === 'male') {
        return 66.47 + (13.7 * profile.weight_kg) + (5 * profile.height_cm) - (6.8 * profile.age);
    }
    return 0;
}

function _processLogs(logs, period, numLabels, { nameKey, valueKey }) {
    const values = Array(numLabels).fill(0);
    const details = Array.from({ length: numLabels }, () => []);
    
    const getIntervalIndex = (logDate) => {
        if (period === 'day') return 0;
        if (period === 'week') return (logDate.getDay() + 6) % 7; // Monday = 0
        if (period === 'month') return logDate.getDate() - 1;
        if (period === 'year') return logDate.getMonth();
        return -1;
    };

    logs.forEach(log => {
        const logDate = new Date(log.log_date);
        const idx = getIntervalIndex(logDate);
        if (idx >= 0 && idx < numLabels) {
            values[idx] += log.calories;
            details[idx].push(`${log[nameKey]}: ${Math.round(log.calories)} kcal`);
        }
    });
    return { values: values.map(Math.round), details };
}

export const DashboardService = {
    getDashboardData: (period, allData) => {
        const { start, end, labels } = _getTimePeriod(period);
        if (!start) return {}; // Invalid period

        // **KORREKTUR: Zugriff auf normalisierte Keys**
        const { consumptionlogs, activitylogs, user_profile } = allData;

        const relevantConsumptions = consumptionlogs.filter(log => new Date(log.log_date) >= start && new Date(log.log_date) <= end);
        const relevantActivities = activitylogs.filter(log => new Date(log.log_date) >= start && new Date(log.log_date) <= end);

        const { values: calories_in, details: details_in } = _processLogs(relevantConsumptions, period, labels.length, { nameKey: 'food_name', valueKey: 'calories' });
        const { values: calories_out_active, details: details_out } = _processLogs(relevantActivities, period, labels.length, { nameKey: 'exercise_name', valueKey: 'calories' });
        
        const dailyBMR = _calculateBMR(user_profile);
        const calories_out_bmr = labels.map(() => Math.round(dailyBMR)); // Simplified for daily BMR, can be expanded

        const total_in = calories_in.reduce((a, b) => a + b, 0);
        const total_out_active = calories_out_active.reduce((a, b) => a + b, 0);
        // This BMR calculation is simplified and should be made more precise for month/year views
        const total_out_bmr = Math.round(dailyBMR * (period === 'day' ? 1 : (period === 'week' ? 7 : 30)));
        const total_out = total_out_active + total_out_bmr;
        const balance = total_in - total_out;

        return {
            labels,
            calories_in,
            calories_out_active,
            calories_out_bmr,
            details_in,
            details_out,
            total_in,
            total_out,
            balance,
            balance_goal: user_profile?.balance_goal_kcal || 0
        };
    }
};

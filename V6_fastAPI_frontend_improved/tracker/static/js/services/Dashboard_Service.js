// This service provides pure functions for calculating dashboard data.
// It relies on date-fns for robust date manipulation. A real project
// should include it via npm/yarn, but here we assume it's globally available.
// A simple date-fns build can be included via: <script src="https://cdn.jsdelivr.net/npm/date-fns@2.28.0/cdn.min.js"></script>

function _get_time_period(period_string) {
    const today = new Date();
    let start, end, labels = [];

    switch (period_string) {
        case 'day':
            start = new Date(today.setHours(0, 0, 0, 0));
            end = new Date(today.setHours(23, 59, 59, 999));
            labels = ['Heute'];
            break;
        case 'week':
            // Assuming week starts on Monday
            const day_of_week = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
            const diff = today.getDate() - day_of_week + (day_of_week === 0 ? -6 : 1);
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

function _calculate_BMR(profile) {
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

function _process_logs(logs, period, numLabels, { nameKey, valueKey }) {
    const values = Array(numLabels).fill(0);
    const details = Array.from({ length: numLabels }, () => []);
    
    const get_interval_index = (logDate) => {
        if (period === 'day') return 0;
        if (period === 'week') return (logDate.getDay() + 6) % 7; // Monday = 0
        if (period === 'month') return logDate.getDate() - 1;
        if (period === 'year') return logDate.getMonth();
        return -1;
    };

    logs.forEach(log => {
        const logDate = new Date(log.log_date);
        const idx = get_interval_index(logDate);
        if (idx >= 0 && idx < numLabels) {
            values[idx] += log.calories;
            details[idx].push(`${log[nameKey]}: ${Math.round(log.calories)} kcal`);
        }
    });
    return { values: values.map(Math.round), details };
}

export const Dashboard_Service = {
    get_dashboard_data: (period, all_data) => {
        const { start, end, labels } = _get_time_period(period);
        if (!start) return {}; // Invalid period

        // **KORREKTUR: Zugriff auf normalisierte Keys**
        const { consumption_logs, activity_logs, user_profile } = all_data;

        const relevant_consumptions = consumption_logs.filter(log => new Date(log.log_date) >= start && new Date(log.log_date) <= end);
        const relevant_activities = activity_logs.filter(log => new Date(log.log_date) >= start && new Date(log.log_date) <= end);

        const { values: calories_in, details: details_in } = _process_logs(relevant_consumptions, period, labels.length, { nameKey: 'food_name', valueKey: 'calories' });
        const { values: calories_out_active, details: details_out } = _process_logs(relevant_activities, period, labels.length, { nameKey: 'exercise_name', valueKey: 'calories' });
        
        const daily_BMR = _calculate_BMR(user_profile);
        const calories_out_bmr = labels.map(() => Math.round(daily_BMR)); // Simplified for daily BMR, can be expanded

        const total_in = calories_in.reduce((a, b) => a + b, 0);
        const total_out_active = calories_out_active.reduce((a, b) => a + b, 0);
        // This BMR calculation is simplified and should be made more precise for month/year views
        const total_out_bmr = Math.round(daily_BMR * (period === 'day' ? 1 : (period === 'week' ? 7 : 30)));
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

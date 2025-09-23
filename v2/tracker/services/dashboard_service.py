from datetime import datetime, time, date, timedelta
from dateutil.relativedelta import relativedelta

def get_time_period(period_str, today_date):
    match period_str:
        case 'day':
            start = datetime.combine(today_date, time.min)
            end = datetime.combine(today_date, time.max)
            chart_labels = [f"{h:02d}:00" for h in range(24)]
        case 'week':
            start_of_week = today_date - timedelta(days=today_date.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            start = datetime.combine(start_of_week, time.min)
            end = datetime.combine(end_of_week, time.max)
            chart_labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
        case 'month':
            start_of_month = today_date.replace(day=1)
            end_of_month = (start_of_month + relativedelta(months=1)) - timedelta(days=1)
            start = datetime.combine(start_of_month, time.min)
            end = datetime.combine(end_of_month, time.max)
            chart_labels = [str(d) for d in range(1, end_of_month.day + 1)]
        case 'year':
            start_of_year = today_date.replace(month=1, day=1)
            end_of_year = today_date.replace(month=12, day=31)
            start = datetime.combine(start_of_year, time.min)
            end = datetime.combine(end_of_year, time.max)
            chart_labels = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
        case _:
            return None, None, None
    return start, end, chart_labels

def calculate_bmr(profile):
    if not (profile and profile.gender and profile.age and profile.height_cm and profile.weight_kg):
        return 0, None
    
    bmr_val = 0
    if profile.gender.lower() == 'female':
        bmr_val = 655.1 + (9.6 * profile.weight_kg) + (1.8 * profile.height_cm) - (4.7 * profile.age)
    elif profile.gender.lower() == 'male':
        bmr_val = 66.47 + (13.7 * profile.weight_kg) + (5 * profile.height_cm) - (6.8 * profile.age)
    
    return round(bmr_val), profile.tracking_start_date

def process_logs(logs, period, num_labels, model_class):
    calories_list = [0] * num_labels
    details_list = [[] for _ in range(num_labels)]
    
    def get_interval_index(log_date_local, period_str):
        if period_str == 'day': return log_date_local.hour
        if period_str == 'week': return log_date_local.weekday()
        if period_str == 'month': return log_date_local.day - 1
        if period_str == 'year': return log_date_local.month - 1
        return -1

    for log in logs:
        is_consumption = model_class.__name__ == 'ConsumptionLog'
        calories = (log.amount_g / 100 * log.food.calories_per_100g) if is_consumption else (log.duration_min / 60 * log.exercise_type.calories_per_hour)
        name = log.food.name if is_consumption else log.exercise_type.name
        
        idx = get_interval_index(log.log_date.astimezone(), period)
        if 0 <= idx < num_labels:
            calories_list[idx] += calories
            details_list[idx].append(f"{name}: {round(calories)} kcal")
    
    return [round(c) for c in calories_list], details_list

def add_bmr_to_calories_out(calories_out_list, daily_bmr, period_str, start_date_dt, today_date, tracking_start):
    if not (daily_bmr > 0 and tracking_start):
        return calories_out_list

    match period_str:
        case 'day':
            limit_index = datetime.now().hour
            bmr_per_interval = daily_bmr / 24
            day_date = start_date_dt.date()
            if day_date >= tracking_start:
                for i in range(len(calories_out_list)):
                    if i <= limit_index:
                        calories_out_list[i] += bmr_per_interval
        case 'week' | 'month':
            limit_index = today_date.weekday() if period_str == 'week' else today_date.day - 1
            for i in range(len(calories_out_list)):
                day_date = start_date_dt.date() + timedelta(days=i)
                if i <= limit_index and day_date >= tracking_start:
                    calories_out_list[i] += daily_bmr
        case 'year':
            limit_month_index = today_date.month - 1
            for i in range(len(calories_out_list)):
                month_start = date(today_date.year, i + 1, 1)
                if tracking_start and month_start < tracking_start.replace(day=1):
                    continue
                
                if i < limit_month_index:
                    days_in_month = (month_start + relativedelta(months=1) - timedelta(days=1)).day
                    calories_out_list[i] += daily_bmr * days_in_month
                elif i == limit_month_index:
                    start_day = max(1, tracking_start.day if tracking_start and tracking_start.month == i + 1 else 1)
                    days_to_add = today_date.day - start_day + 1
                    if days_to_add > 0:
                        calories_out_list[i] += daily_bmr * days_to_add
    
    return [round(c) for c in calories_out_list]

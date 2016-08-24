import requests
import datetime
import json
from concurrent.futures import ThreadPoolExecutor
import threading

BASE_URL = 'http://localhost:3000'

def login(username, password):
    result = requests.Session()
    resp = result.post(BASE_URL + '/auth', json={'username':username, 'password':password})
    if resp.status_code != 200:
        raise Exception('Code: {0} Body: {1}'.format(resp.status_code, resp.text))
    return result

# Input None for the latest date.
# Default base is EUR.
def get_rates(date=None, base=None):
    url = 'http://api.fixer.io/'
    if date is not None:
        url += date.isoformat()
    else:
        url += 'latest'
    if base is not None:
        url += '?base=' + base
    return requests.get(url).json()

def get_all_rates(date=None):
    first = get_rates(date)
    text_date = date.isoformat()
    def to_json(resp):
        base = resp['base']
        return ({'currency1': base, 'currency2': curr, 'oneToTwo': rate} for curr, rate in resp['rates'].items())

    for to_ret in to_json(first):
        yield to_ret

    for base in first['rates'].keys():
        rates = get_rates(date, base)
        assert base == rates['base']
        for to_ret in to_json(rates):
            yield to_ret

def record_rate_data(date, sess):
    pojo = {'date': date.isoformat(), 'exchangeRates': list(get_all_rates(date))}
    url = BASE_URL + '/curr'
    resp = sess.post(url, json=pojo)
    if resp.status_code != 201:
        raise Exception('Code: {0} Body: {1}'.format(resp.status_code, resp.text))

if __name__ == '__main__':
    # Start at today and go to current.
    def get_dates():
        last_date = datetime.date.today()
        current_date = datetime.date(2000, 5, 3)
        one_day = datetime.timedelta(days=1)
        while current_date <= last_date:
            yield current_date
            current_date += one_day

    executor = ThreadPoolExecutor(max_workers=16)
    sessions = threading.local()
    def get_data_thread(date):
        print('Getting data for ' + date.isoformat())
        sess = getattr(sessions, 'sess', None)
        if sess is None:
            sess = login('slaymaker1907', '1149154g')
            sessions.sess = sess
        record_rate_data(date, sess)
        return True
    all(executor.map(get_data_thread, get_dates()))

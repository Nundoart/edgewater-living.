"""Fetch the authorized report; update only previously Zillow-matched homes.
No credentials or raw report content are saved, printed, or uploaded.
"""
import io, json, os, re, sys
from datetime import datetime, timezone
from pathlib import Path
import pdfplumber

REPORT_URL = 'https://thsql1.truehomesusa.com/ReportServer?/THLotMgt/Showcase_Homes_Inventory&rs:Command=Render&rs:Format=PDF'


def parse_report(content):
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
    if 'True Homes Showcase Homes' not in text:
        raise ValueError('Unexpected report format; existing listings preserved.')
    date = re.search(r'\b(\d{1,2}/\d{1,2}/\d{4})\b', text)
    if not date:
        raise ValueError('Report date missing; existing listings preserved.')
    report_date = datetime.strptime(date[1], '%m/%d/%Y').date()
    age = (datetime.now(timezone.utc).date() - report_date).days
    if not 0 <= age <= 2:
        raise ValueError('Report is outdated; existing listings preserved.')
    rows = {}
    # Only extract house address and price; never employee/contact columns.
    pattern = r'(\d{4,5})\s+(Serendipity Dr|Lakeshore Drive|Windward Lane|Crooked Stick Dr\.?|Monterrico Drive|Greg Norman Drive)\s+Lancaster\b.*?\$([\d,]+\.\d{2})'
    for match in re.finditer(pattern, text):
        address = normalize(match[1] + ' ' + match[2])
        rows[address] = float(match[3].replace(',', ''))
    if len(rows) < 3:
        raise ValueError('Too few recognized Edgewater rows; existing listings preserved.')
    return rows, report_date.isoformat()


def normalize(address):
    address = address.split('#')[0].strip().lower().replace('.', '')
    return re.sub(r'\s+', ' ', address.replace(' drive', ' dr').replace(' lane', ' ln'))


def fetch_report():
    import requests
    from requests_ntlm import HttpNtlmAuth
    username = os.environ.get('TRUEHOMES_USERNAME')
    password = os.environ.get('TRUEHOMES_PASSWORD')
    if not username or not password:
        raise ValueError('Required GitHub secrets are not configured. No request made.')
    # Fixed HTTPS destination, certificate validation enabled, no redirects/retries.
    with requests.Session() as session:
        session.auth = HttpNtlmAuth(username, password)
        with session.get(REPORT_URL, timeout=(15, 60), allow_redirects=False, stream=True) as response:
            if response.status_code != 200:
                raise ValueError(f'Report access failed (HTTP {response.status_code}); existing listings preserved.')
            chunks, size = [], 0
            for chunk in response.iter_content(65536):
                size += len(chunk)
                if size > 20 * 1024 * 1024:
                    raise ValueError('Report exceeds size limit; existing listings preserved.')
                chunks.append(chunk)
            content = b''.join(chunks)
    if not content.startswith(b'%PDF'):
        raise ValueError('Server did not return a PDF; existing listings preserved.')
    return content


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--validate-pdf':
        rows, date = parse_report(Path(sys.argv[2]).read_bytes())
        print(f'Validated {len(rows)} Edgewater addresses; report date {date}.')
        return
    rows, date = parse_report(fetch_report())
    path = Path('listings.json')
    data = json.loads(path.read_text())
    now = datetime.now(timezone.utc).isoformat()
    changes = 0
    for home in data['listings']:
        if home.get('reportMatched') is not True:
            continue
        key = normalize(home['address'])
        home.setdefault('zillowCheckedAt', home['checkedAt'])
        home['reportCheckedAt'] = now
        home['checkedAt'] = now
        home['reportDate'] = date
        home['status'] = 'Active' if key in rows else 'Unavailable'
        if key in rows:
            home['price'] = rows[key]
            home['priceSource'] = 'True Homes inventory report'
        changes += 1
    data['checkedAt'] = now
    data['checkSource'] = 'True Homes inventory report'
    path.write_text(json.dumps(data, indent=2) + '\n')
    print(f'Updated {changes} previously Zillow-matched homes. New addresses require Zillow verification.')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        # Never log HTTP bodies, authentication values, or raw report text.
        print(str(exc) if isinstance(exc, ValueError) else 'Inventory import failed; existing listings preserved.', file=sys.stderr)
        sys.exit(1)

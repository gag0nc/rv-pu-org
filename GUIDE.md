# Admission Manager: Setup and Daily Use

For Sri RV PU College, Kolar. This guide covers running the app on a school PC or on an online server, opening it from other computers and phones, turning it into a desktop app, and using it day to day.

## 1. How it works

The app keeps all its data in one file, `data/admissions.db`, on **one computer** (the "server"). Everyone else opens the app in a web browser by typing the server's address. Everybody sees the same records at the same time.

That is why the app must run in one place. Installing separate copies on several computers would split the enquiries across them.

### Two ways to run it

| | On the school network | Online |
|---|---|---|
| Who can use it | Anyone on the school Wi-Fi or LAN | Anyone with the web address and a login, from any place |
| Running cost | Nothing | About $5 to $7 a month for a small server, plus a web address |
| Internet needed | No | Yes |
| If something fails | Nobody can work while the PC is off, asleep or broken | The server stays on whether or not the office PC is |
| Setup | About 20 minutes (sections 2 to 5) | About one hour, once (section 11) |

If every user works inside the school, use the school network. If staff need to enter or check enquiries from home, from a phone on mobile data, or from another branch, go online. You can start on the school network and move online later by copying the `data` folder (see section 11), so the first choice is not final.

## 2. First-time setup (Windows)

1. Install **Python 3.9 or newer** from python.org. On the first installer screen, tick **"Add Python to PATH"**.
2. Right-click `admission-manager.zip`, choose **Extract All** and open the folder that appears. Move the folder inside it, called `admission-app`, to `C:\` and rename it `AdmissionManager`, so that `start.bat` is at `C:\AdmissionManager\start.bat`. Do not keep it in Desktop, Documents, OneDrive or Google Drive folders, because file syncing can lock or damage the database.
3. Double-click **`start.bat`**. The first run downloads three small packages (internet needed once) and starts the app.
4. A black window shows the **administrator password**. It is also saved in `data\FIRST_LOGIN.txt`.
5. Open Chrome or Edge and go to **http://localhost:8000**. Sign in as `admin` with that password. You will be asked to choose your own password. As soon as you do, `FIRST_LOGIN.txt` deletes itself.

Leave the black window open while people use the app. Closing it stops the app. Section 5 shows how to make it start by itself instead.

Linux or Mac: run `./start.sh` instead.

## 3. Opening it from other computers and phones

1. On the server PC, press Windows+R, type `cmd`, then run `ipconfig`. Note the **IPv4 Address**, for example `192.168.1.25`.
2. The first time the app starts, Windows asks about the firewall. Click **Allow** for **Private networks**. If other computers still cannot connect, open Settings → Network & internet, open your Wi-Fi or Ethernet connection, and set the network profile to **Private**.
3. On any computer or phone connected to the same Wi-Fi or LAN, open `http://192.168.1.25:8000` (use your own address).
4. Ask whoever manages your router to give the server PC a **fixed IP address** (a "DHCP reservation"). Otherwise the address can change after a restart and the bookmark stops working.

Do not open this port to the public internet. It is meant for the school network. For access from outside, use section 11.

## 4. Use it like an installed app

On each computer that will use it:

- **Chrome:** open the address, then menu (three dots) → **Cast, save and share → Install page as app** (or **Create shortcut** and tick **Open as window**).
- **Edge:** menu → **Apps → Install this site as an app**.

This puts an icon on the desktop or taskbar that opens the app in its own window without browser tabs. On a phone, use the browser menu → **Add to Home screen**.

## 5. Keep it running (school network setup)

People can use the app only while the server PC is on and the app is running. These settings prevent most "it stopped working" calls.

1. **Never sleep.** Settings → System → Power, and set the sleep options to **Never** while plugged in.
2. **Restart at a quiet time.** Settings → Windows Update → Advanced options → Active hours, and set your office hours, so Windows does not restart the PC in the middle of the day.
3. **Use a UPS** if power cuts are common. It keeps the PC running through short cuts and lets it shut down cleanly in long ones.
4. **Start the app by itself** after a restart or power cut, using one of the two methods below.

**Method A: Task Scheduler (recommended).** The app starts even when nobody has signed in to Windows. The Windows account needs a password.

1. Run `start.bat` by hand once first (section 2), so the packages are installed and Windows has asked about the firewall.
2. Press the Windows key, type **Task Scheduler** and open it. In the right-hand panel choose **Create Task** (not Create Basic Task).
3. General tab: name it `Admission Manager` and choose **Run whether user is logged on or not**.
4. Triggers tab → **New** → Begin the task: **At startup** → OK.
5. Actions tab → **New** → Action: **Start a program**. Program/script: `wscript.exe`. Add arguments: `"C:\AdmissionManager\start-background.vbs"` (use your own folder). Start in: `C:\AdmissionManager`.
6. Settings tab: **untick** "Stop the task if it runs longer than". Windows ticks this by default and would stop the app after three days.
7. Press OK and type the Windows password when asked.
8. Restart the PC, wait a minute, and open `http://localhost:8000` on it. If the sign-in page appears, it works.

**Method B: Startup folder (simpler).** The app starts after someone signs in to Windows.

1. Press Windows+R, type `shell:startup`, press Enter.
2. Right-click `start-background.vbs` in the app folder → **Create shortcut**, then move that shortcut into the Startup folder that opened.

With either method the app runs silently, with no black window. To stop it, open Task Manager and end **python.exe**. Do this before copying or restoring the database.

## 6. Daily use

**Signing in**
- Type your username and password, then click **Sign in**.
- Tick **Remember me** on your own computer or phone. It keeps you signed in until you have not used the app for 7 days, and fills in your username next time. Leave it unticked on a shared computer: you are then signed out when the browser closes, or after 8 hours without use.
- **Forgot password?** tells you to ask the administrator for a reset (section 7).
- When you change your password, you are signed out on every other device. Sign in again there with the new one.

**Adding a new entry** (a call, a walk-in or a filled paper form)
1. Click **New Entry**. Two choices appear: **Enter Manually** and **Scan Filled Form** (section 6A).
2. **Enter Manually** opens the blank form with today's date filled in. Enter the student's name, at least one parent mobile number, and as much of the form as you have. Percentages calculate themselves from the marks. Student, parent, school and town names are saved in capital letters, as on the paper form.
3. If the mobile number already exists, a yellow notice shows the earlier entry so you do not duplicate it.
4. Set a **Follow-up date** and a **counsellor**, then **Save Entry**. Press Ctrl+S to save quickly. Press Esc to close the form or any pop-up window; if there are unsaved changes the app asks first.

**Changing the status**
- In the grid, use the colour dropdown on the row. The colour changes straight away.
- Grey is New, green is Admission Confirmed, amber is Under Discussion, blue is Exploring Other Options, red is Not Interested.

**Follow-ups**
- The bell at the top shows how many follow-ups are overdue or due today. Click it to see them.
- Only enquiries that are still open (New, Under Discussion, Exploring Other Options) are counted. Once an enquiry is Admission Confirmed or Not Interested, its follow-up date no longer shows up as due.
- The dashboard also lists follow-ups for the next 7 days. On the Enquiries page, the follow-up filter offers Due now, Overdue, Due today and Next 7 days.

**Finding students**
- The search box at the top searches name, mobile, enquiry number, school, town and counsellor. Press Enter.
- On the Enquiries page, filter by stream, coaching, counsellor, counselling status, follow-up and dates. Click any column title to sort.

**Export and print**
- **Export to Excel** downloads exactly what the filters currently show, with status colours and a summary sheet. Clear the filters first to export everything.
- Open an enquiry and click **Print** for an A4 copy laid out like your paper form. **Print blank form** gives a blank one.

**Counselling and conversions**
- Each enquiry has a **Counselling completed on** date in section 7 of the form. Empty means counselling is still pending.
- It fills in automatically the first time you move an enquiry out of **New**, so counsellors don't need to enter it. Change or clear it on the form if it is wrong.
- Give every enquiry a **counsellor** (Assigned counsellor on the form).
- The dashboard's **Counsellor track** table shows, for each counsellor, how many they have counselled, how many became admissions, and the conversion (admissions as a share of counselled). Use the dropdown above the table for a period such as This Month. Click a counsellor to see their students.
- The **Counselling funnel** shows enquiries, counselled and admitted for the whole school.
- On the Enquiries page, filter by counsellor, or by Counselled / Not yet counselled, to see who still needs a call.

**Dashboard**
- The four cards show total enquiries, confirmed admissions, open enquiries (still deciding) and not interested. The arrow compares the last 7 days with the 7 days before. Click a card to open that list of students.
- The chart switches between yearly and the last week. The counsellor track and the follow-ups list are below.

### 6A. Scanning a filled paper form

Use this when someone has already filled in the paper Student Enquiry Form. The app reads the handwriting and fills the form in for you, so you only check it. It needs to be switched on first by the administrator (section 7A). If it is not, the Scan option says so and **Enter Manually** still works.

1. Click **New Entry**, then **Scan Filled Form**. On a phone, the camera opens. On a computer you choose a photo file instead. **Choose A Photo From This Device Instead** lets you use a photo you already took.
2. Photograph the **whole page**: flat on a table, in good light, held straight above it, with all four edges in view and no shadow or finger over the writing. One page per photo.
3. Wait 15 to 40 seconds. The new entry then opens already filled in, under an amber note, **Filled in from the photo**.
4. **Check every field against the paper form.** Handwriting can be misread, so the app never saves by itself. Fields it was unsure about are highlighted and listed in the note as small tags. Tap a tag to jump to that field. A highlight goes away as soon as you change the field. **View photo** shows the picture next to the form so you can compare.
5. Fix anything wrong, then click **Save Entry**. Nothing is saved until you do. The Activity log records that the entry came from a scanned form.

The photo is not kept by the app. If the scan fails, you are offered **Try Again** or **Enter Manually**. At least one parent mobile number is needed to save, as with a manual entry.

## 7. People and permissions (administrator only)

Go to **Users → Add user**. Give each person their own login, and tell them the temporary password privately. They must change it at first sign-in.

| Role | Can do |
|---|---|
| Admin | Everything: users, delete, Excel import, sample data, scan settings, the Activity log, the Counsellor track and the management remark |
| Counsellor | Add and edit enquiries, change status, export (without Aadhaar numbers). Does not see Users, Activity log or the Counsellor track; on the dashboard the Follow-ups list fills the whole bottom row |
| Viewer | Sees the same screens as a counsellor, read only, Aadhaar masked, no export |

- When someone leaves, click **Disable** instead of deleting them. The history stays complete.
- A forgotten password: **Reset password** gives a new temporary one.
- After 5 wrong passwords an account locks for 10 minutes. A network that makes 30 wrong attempts in 10 minutes is also paused for a while.
- **Activity log** shows who created, changed, exported or deleted what, every scan, and every sign-in with the network address it came from.
- Resetting someone's password also signs them out everywhere.

### 7A. Setting up form scanning (administrator only)

Scanning uses Claude, an AI service from Anthropic, to read the photo. It is optional and off until you add a key.

1. Create an account at **console.anthropic.com**, add credit under Billing, and create a key under **API keys**. Copy the whole key, which starts with `sk-ant-`.
2. In the app, open **Users** and click **Scan settings**. Paste the key and click **Save key**. The app checks the key with Anthropic before keeping it. **Test connection** repeats the check at any time. **Remove key** turns scanning off.
3. The key is saved in the app's database. It is never shown again (only its last four characters). Anyone with access to the database can read it, so keep it private. If you prefer, set the `ANTHROPIC_API_KEY` environment variable on the server instead; it then takes priority and cannot be removed from the screen.

Things to know before you switch it on:
- **Internet:** the computer that runs the app must be able to reach `api.anthropic.com`. On a school PC with no internet, scanning stays unavailable and manual entry is unaffected.
- **Cost:** Anthropic bills your account for each scan. With the default model it is roughly a couple of rupees a form. Scan settings shows how many scans were made this month. Set a monthly spend limit in the Anthropic console. To lower the cost, set `ADMISSIONS_SCAN_MODEL=claude-haiku-5-5`, which is cheaper but may misread more handwriting.
- **Privacy:** the photo is sent to Anthropic over HTTPS to be read, and the forms hold personal details of students and parents, including Aadhaar numbers and phone numbers. Read Anthropic's current terms on how API data is handled and make sure that suits the college's own privacy rules before turning scanning on. If it does not, leave it off.
- **Limits:** each person can scan 25 forms in 10 minutes, and 3 scans can run at the same moment across the college. Phone photos are shrunk before sending, so large camera pictures are fine. If you put your own proxy such as Nginx in front of the app, let it pass request bodies of at least 6 MB (`client_max_body_size 6m;`); the supplied Caddy setup needs no change.
- **Accuracy:** scanning saves typing, not checking. Staff must compare each scanned entry with the paper form before saving.

## 8. Backups

- The app copies the database every day into `data\backups\` and keeps the last 30.
- The **Download backup** button was removed from the website at the college's request. Use **Export to Excel** (admin) for a copy of every enquiry at any time.
- In the hosted version (Vercel + Neon Postgres, see section 12) the database provider keeps its own restore history; the folder steps below apply only when the app runs on a school PC.
- **Once a week, copy the `data` folder to a pen drive or another PC.** A backup on the same computer does not protect you if that computer fails.
- **To restore:** stop the app, copy a backup file to `data\admissions.db` (replacing it), delete `admissions.db-wal` and `admissions.db-shm` from the same folder if they exist, then start the app again.
- **To move to another PC:** stop the app, install Python on the new PC, unzip a fresh copy as in section 2, copy the old `data` folder into it (replacing the new one), and run `start.bat`. Do not copy the old `venv` folder.

## 9. Making it yours

- **Sign-in page picture:** replace `static/login-bg.jpg` with a photo of your own building, as a JPEG about 2000 pixels wide. The sign-in card is see-through, so the whole picture shows behind it.
- **Logo:** replace `static/logo-navy.png` with your official logo as a transparent PNG. It is shown on the sign-in page and in the sidebar. The current file is your college crest, cleaned up with a transparent background. Use a PNG at least 500 pixels wide; `static/favicon.png` is the small browser-tab icon.
- **Fonts:** headings use Source Serif 4 and the rest uses Hanken Grotesk. Both are stored in `static/fonts`, so nothing is downloaded and the app still works offline.
- **School name:** edit `COLLEGE_NAME` and `PRINT_TITLE` near the top of `app.py`. `COLLEGE_NAME` is the screen heading and `PRINT_TITLE` is the printed form heading.
- **Lists** such as streams, categories, sources (including Others, as on the paper form) and statuses are also near the top of `app.py`.
- **Remember me length:** set `ADMISSIONS_REMEMBER_DAYS` (default 7, up to 60). `0` removes the Remember me choice and signs everyone out after 8 hours of no use.
- **Port:** set the environment variable `ADMISSIONS_PORT` if 8000 is already used.

Restart the app after any change to `app.py`.

## 10. If something goes wrong

| Problem | What to do |
|---|---|
| Page will not open on another computer | Check the server PC is on and the app is running. Check both are on the same network. Allow Python in the Windows firewall and set the network profile to Private. Check the IP has not changed. |
| "python is not recognised" | Reinstall Python and tick **Add Python to PATH**. |
| First start ends with "Installation failed" | The first start needs the internet to download three small packages. Connect, then double-click `start.bat` again. It repeats the installation until it succeeds. |
| Port already in use | Close any other copy of the app, or set a different `ADMISSIONS_PORT`. |
| Scan Filled Form says "Not set up yet" | The administrator has not added a scanning key. See section 7A. Meanwhile use **Enter Manually**. |
| "The scanning key was not accepted" | The key is wrong, removed or switched off. The administrator creates a new key in the Anthropic console and pastes it in Users → Scan settings. |
| "The Anthropic account has no credit left" | Add credit under Billing in the Anthropic console. |
| "Could not reach the scanning service" | The computer running the app is offline, or a firewall blocks `api.anthropic.com`. |
| "Nothing filled in could be read" or "does not look like the Student Enquiry Form" | Photograph the whole page again: flat, bright and straight, with the edges in view. |
| "Too many scans in a short time" | Wait a few minutes. The limit is 25 scans per person in 10 minutes. |
| You are signed out unexpectedly | Without Remember me you are signed out after 8 hours of no use, or when the browser closes. A password change or reset signs you out on other devices too. |
| Forgot the admin password (hosted version) | In Vercel → project **rv-admission-portal** → Settings → Environment Variables, add `ADMIN_RESET_PASSWORD` with a new temporary password (8+ characters) and redeploy. Sign in as `admin` with it, choose a new password, then delete the variable. |
| Forgot the admin password (school PC) | Open a command window in the app folder and run `python reset_admin.py` (or `venv\Scripts\python reset_admin.py`). It prints a new temporary password for `admin`. Add a username after it, such as `python reset_admin.py meera`, to reset someone else. Your data is not touched. |
| "Record was changed by someone else" | Two people edited the same enquiry. Close it, reopen it to see the latest version, then re-enter your change. |
| Excel will not download | Allow downloads from this address in the browser. |
| Sign-in works but sends you straight back to the sign-in page | `ADMISSIONS_HTTPS=1` is set but the page was opened with plain `http://`. Open the `https://` address, or remove that setting if you only use the school network. |
| "Too many failed sign-in attempts from this network" | Wait ten minutes. The pause protects against password guessing. |
| Online: browser shows a certificate or "site can't be reached" error | Check the address points to the server (`nslookup your-address`), that ports 80 and 443 are open (`ufw status`), and read the log with `journalctl -u caddy -n 50 --no-pager`. A new address can take up to 30 minutes to start working. |
| Online: "502 Bad Gateway" | The app is not running. Run `systemctl status admission-manager` and `journalctl -u admission-manager -n 50 --no-pager`, then `systemctl restart admission-manager`. |
| Activity log times are hours off | The server clock is in another time zone. The supplied service file sets India time. On a school PC, set the Windows time zone to India Standard Time. |

## 11. Putting it online

Use this when staff need to sign in from home, from phones on mobile data, or from other places. The same app runs on a small rented server that is always on, with a secure `https://` address in front of it.

### What you need

- **A small server (a "VPS")** running a current Ubuntu LTS release such as 24.04. One gigabyte of memory is enough. Vultr and DigitalOcean both have Bangalore data centres, with plans from about $5 to $7 a month at the time of writing (October 2026). Choose Bangalore so the app responds quickly.
- **A web address.** The easiest is a sub-address of the school's website, such as `admissions.yourschool.in`. Ask whoever manages the school website to add an **A record** with that name pointing to the server's IP address. Otherwise register a domain; a `.in` domain costs a few hundred rupees a year.
- **About an hour,** and someone who is comfortable pasting commands into a terminal. A freelancer can do it from this guide in under an hour.

The files in the `deploy` folder (`admission-manager.service` and `Caddyfile`) are used in the steps below.

### Steps

**1. Create the server.** In the provider's dashboard create a server with Ubuntu, the Bangalore location and the smallest plan with 1 GB of memory. Use an SSH key or a strong password. Write down the server's IP address.

**2. Point the web address at it.** Create an A record, for example `admissions`, with the server's IP address as its value. Wait up to 30 minutes, then check on your own PC with `nslookup admissions.yourschool.in`. The answer should show the server's IP address.

**3. Connect to the server.** On Windows 10 or 11, open PowerShell and run `ssh root@SERVER_IP`, replacing `SERVER_IP` with the address from step 1.

**4. Prepare the server.** Paste these commands one block at a time. The firewall rule for SSH comes first so you do not lock yourself out.

```
apt update && apt -y upgrade
apt -y install python3-venv unzip rsync ufw
timedatectl set-timezone Asia/Kolkata
ufw allow OpenSSH
ufw allow 80,443/tcp
ufw --force enable
useradd --system --user-group --home-dir /opt/admission-manager --shell /usr/sbin/nologin admission
mkdir -p /opt/admission-manager
```

**5. Install the app.** Open a second PowerShell window on your own PC, go to the folder that holds `admission-manager.zip`, and copy it to the server:

```
scp admission-manager.zip root@SERVER_IP:/tmp/
```

Back in the server window:

```
unzip /tmp/admission-manager.zip -d /tmp/am
cp -r /tmp/am/admission-app/. /opt/admission-manager/
cd /opt/admission-manager
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
chown -R admission:admission /opt/admission-manager
cp deploy/admission-manager.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now admission-manager
curl http://127.0.0.1:8000/healthz
```

The last command should print `{"ok":true}`. The service now starts by itself whenever the server restarts and is restarted automatically if it ever stops.

**6. Add the secure address.** This installs Caddy, a web server that gets and renews the free HTTPS certificate by itself. Replace `admissions.yourschool.in` in the last two commands with your own address.

```
apt -y install debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
apt update && apt -y install caddy
sed 's/admissions.example.in/admissions.yourschool.in/' /opt/admission-manager/deploy/Caddyfile > /etc/caddy/Caddyfile
systemctl reload caddy
```

**7. First sign-in.** Show the temporary password with `cat /opt/admission-manager/data/FIRST_LOGIN.txt`. Open `https://admissions.yourschool.in` in a browser (the first load can take up to a minute while the certificate is issued), sign in as `admin`, and choose your own password. The file then deletes itself.

**8. Check from outside.** On a phone using mobile data, open the address, sign in, add a test enquiry, and delete it again from the admin account.

### Safety checklist

Do all of these before telling staff.

- **Replace the `admin` login.** Under Users, add your own admin account with a name that is hard to guess, sign in with it, then **Disable** the `admin` account. Internet bots try `admin` all day, and five wrong tries lock an account for ten minutes.
- **One login per person,** with the lowest role that fits (section 7). Disable the login when someone leaves.
- **Back up away from the server.** Turn on the provider's automatic server backup. Also copy the `data` folder (or use Export to Excel) once a week and keep it on a pen drive or in your cloud drive. The daily copies the app makes sit on the same server, so they do not help if the server is lost.
- **Watch it.** Add a free uptime monitor such as UptimeRobot that checks `https://admissions.yourschool.in/healthz` every few minutes and emails you when the app is down. A healthy app answers `{"ok":true}`.
- **Update the server monthly.** Connect with `ssh`, run `apt update && apt -y upgrade`, and run `reboot` if it asks. The app and Caddy start again by themselves.
- **Keep port 8000 closed.** The firewall above blocks it and the service only listens on the server itself, so everything goes through the secure address.
- **Handle the data carefully.** The database holds student and parent details, and Aadhaar numbers if you enter them. Online, that data sits on a server on the internet. Leave the Aadhaar field empty unless you really need it.

### Updating the app later

Upload the new zip as in step 5, then:

```
systemctl stop admission-manager
unzip -o /tmp/admission-manager.zip -d /tmp/am
rsync -a --exclude data /tmp/am/admission-app/ /opt/admission-manager/
chown -R admission:admission /opt/admission-manager
systemctl start admission-manager
```

Your enquiries stay, because the `data` folder is left alone.

### Moving your data from the school PC to the server

Stop the app on the PC first (end **python.exe** in Task Manager). Copy `C:\AdmissionManager\data\admissions.db` to the server with `scp` into `/tmp/`. Then on the server:

```
systemctl stop admission-manager
rm -f /opt/admission-manager/data/admissions.db-wal /opt/admission-manager/data/admissions.db-shm
cp /tmp/admissions.db /opt/admission-manager/data/admissions.db
chown admission:admission /opt/admission-manager/data/admissions.db
systemctl start admission-manager
```

All users, passwords and enquiries come across. Sign in with your existing school PC login.

### Alternative: keep the school PC and add a secure online address

If the app already runs on a school PC (sections 2 to 5) and you do not want to rent a server, use a Cloudflare Tunnel. It needs a free Cloudflare account and a domain that is added to Cloudflare, because Cloudflare requires a website to be added before you can publish an application through a tunnel. The PC must stay on and connected. When it is off, the online address stops working as well.

1. Add your domain to Cloudflare and follow its steps to change the name servers at the place where you registered the domain.
2. In the Cloudflare dashboard open **Networking → Tunnels → Create a tunnel**. Name it, choose Windows, and run the install command it shows on the school PC in a Command Prompt opened as administrator. Check that `cloudflared` appears in the Windows Services list so it starts with the PC.
3. In the tunnel's **Routes** tab choose **Add route → Published application**. Enter the sub-address (for example `admissions`), pick your domain, and set the service URL to `http://localhost:8000`.
4. Add two system environment variables, `ADMISSIONS_HTTPS` with the value `1` and `ADMISSIONS_PROXY` with the value `1` (Windows search: "Edit the system environment variables" → Environment Variables → New under System variables). Restart the PC.
5. Open `https://admissions.yourdomain` on a phone using mobile data to check.

With `ADMISSIONS_HTTPS=1`, everyone must use the `https://` address, including staff in the office. The old `http://192.168...` address will accept the password but will not keep people signed in. If you want both to work, set only `ADMISSIONS_PROXY` and leave `ADMISSIONS_HTTPS` out.

Do not use Cloudflare's "quick tunnel" (a random `trycloudflare.com` address) for daily work. Cloudflare describes it as a testing tool, the address changes every time, and it has no uptime guarantee.

### Free hosting to avoid

Free app hosts such as Render's free plan erase local files whenever the service restarts, redeploys or goes idle, and they cannot attach a persistent disk. This app keeps everything in one file, so every enquiry would be lost. Use a server that has its own disk, as above.

### Settings used online

| Variable | Meaning |
|---|---|
| `ADMISSIONS_HOST` | `127.0.0.1` makes the app reachable only from the server itself, so only the secure address works |
| `ADMISSIONS_HTTPS` | `1` marks the sign-in cookie as secure. Use it only when everyone uses `https://` |
| `ADMISSIONS_PROXY` | `1` tells the app to trust the address forwarded by Caddy or Cloudflare, so the Activity log and the sign-in limit see each person's real address |
| `TZ` | The time zone for dates and times on Linux. The supplied service file sets `Asia/Kolkata` |
| `ANTHROPIC_API_KEY` | Optional. A scanning key set on the server, instead of pasting it in Scan settings |
| `ADMISSIONS_SCAN_MODEL` | Optional. The model used to read forms. Default `claude-sonnet-5-5` |
| `ADMISSIONS_REMEMBER_DAYS` | How long Remember me lasts. Default 7 |

Scanning needs the server to reach the internet. If your firewall blocks outgoing traffic, allow `api.anthropic.com` on port 443.

Set `ADMISSIONS_PROXY=1` only when the app really is behind Caddy or a tunnel. On a plain school network leave it unset.


## 12. Hosted version: website + portal (no server to run)

The college does not need its own server. Two free projects run online and share one database:

| Part | Address now | Address after the domain is bought | What it is |
|---|---|---|---|
| Website | https://srirvpucollege.vercel.app | srirvpucollege.com | Public college website (folder `website/`) |
| Admission portal | https://rv-admission-portal.vercel.app | admissionportal.srirvpucollege.com | This app (Flask) |
| Database | Neon Postgres, Singapore | same | All enquiries, users and settings |

**How the two are linked.** Every form on the website (home page, the bottom-left pop-up, the online enquiry page, call-back, campus visit, exit offer) sends the enquiry to the portal at `/api/public/enquiry`. It appears straight away as a **New** enquiry with source **Website**, a follow-up date of today, and a box on the form showing which website form it came from. The dashboard shows a banner with the number of website enquiries waiting for a first call. If the same student and mobile enquire again, no duplicate is created; the entry notes it.

**Same code, two ways to store data.** If the setting `DATABASE_URL` is present the app uses Postgres; if not, it uses the SQLite file in `data/` exactly as before. The college can move between them at any time (export/import or a database copy), so nothing is locked in.

**Settings used online (Vercel → rv-admission-portal → Settings → Environment Variables)**
- `DATABASE_URL`: added automatically by the Neon integration.
- `ADMIN_INITIAL_PASSWORD`: password of the very first `admin` account (only used when the database has no users).
- `PUBLIC_ORIGINS`: website addresses allowed to send enquiries, comma separated. Add `https://srirvpucollege.com,https://www.srirvpucollege.com` (already included).
- `ANTHROPIC_API_KEY` (optional): scanning key, instead of entering it in Scan settings.
- `ADMIN_RESET_PASSWORD` (emergency only): see section 10.

**Connecting the domain (once `srirvpucollege.com` is bought)**
1. In Vercel → project **srirvpucollege** → Settings → Domains, add `srirvpucollege.com` and `www.srirvpucollege.com`.
2. In Vercel → project **rv-admission-portal** → Settings → Domains, add `admissionportal.srirvpucollege.com`.
3. At the domain seller, add the DNS records Vercel shows (an A record for the main domain and CNAME records for `www` and `admissionportal`).
4. In `website/assets/config.js`, set `staffPortal` to `https://admissionportal.srirvpucollege.com` and `portal` to the same address, then redeploy the website.

**Before going live**
- Users → **Sample data** → remove the 48 made-up entries.
- Users → **Import from Excel** → import the existing Walk-In Enquiry List (duplicates across the PCMB/PCMC sheets are skipped automatically).
- Check every item marked `CONFIRM` in `website/assets/config.js` (phones, WhatsApp number, office hours, rating) and replace the placeholder photos (see `website/CREDITS.md`).
- Vercel's free Hobby plan is for non-commercial use. For the college, move both projects to a Vercel account owned by the college (Pro plan) and make the GitHub repository private.

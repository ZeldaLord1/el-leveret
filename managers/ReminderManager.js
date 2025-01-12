import path from "path";
import fs from "fs/promises";

import { getClient, getLogger } from "../LevertClient.js";
import ReminderDatabase from "../database/ReminderDatabase.js";

class ReminderManager {
    constructor() {
        this.owner = getClient().config.owner;

        this.maxMsgLength = 512;
    }

    async loadDatabase() {
        const remind_dbPath = path.join(getClient().config.dbPath, "remind_db.db");

        this.remind_db = new ReminderDatabase(remind_dbPath);

        try {
            await fs.access(remind_dbPath);
        } catch(err) {
            getLogger().info("Reminder database not found. Creating at path " + remind_dbPath);

            await fs.mkdir(getClient().config.dbPath, {
                recursive: true
            });

            await this.remind_db.create_db();
        }

        await this.remind_db.load();

        getLogger().info("Successfully loaded reminder database.");
    }

    checkMsg(msg) {
        if(msg.length > this.maxMsgLength) {
            return `Reminder messages can be at most ${this.maxMsgLength} characters long.`;
        } else if(msg.indexOf("\n") !== -1) {
            return "Reminder messages can only contain a single line.";
        }
    }

    fetch(id) {
        return this.remind_db.fetch(id);
    }

    add(id, end, msg) {
        return this.remind_db.add(id, end, msg);
    }

    async remove(id, ind) {
        const reminders = await this.fetch(id);

        if(ind >= reminders.length) {
            return false;
        }

        return this.remind_db.remove(id, reminders[ind].ind);
    }

    async removeAll(id) {
        return await this.remind_db.removeAll(id);
    }

    async checkPast(date) {
        date = date ?? Date.now();

        const reminders = await this.remind_db.list(),
              past = reminders.filter(x => x.end < date);
        
        for(const remind of past) {
            await this.remind_db.remove(remind.id, remind.ind);
        }

        return past;
    }

    async sendReminders() {
        const reminders = await this.checkPast();

        for(const reminder of reminders) {
            const user = await getClient().findUserById(reminder.id);

            if(!user) {
                continue;
            }

            let out = `You set a reminder for <t:${Math.floor(reminder.end / 1000)}:f>`;

            if(reminder.msg.length > 0) {
                out += ` with the message: **${reminder.msg}**`;
            } else {
                out += ".";
            }
            
            await user.send(out);
        }
    }
}

export default ReminderManager;
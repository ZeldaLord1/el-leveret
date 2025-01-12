import { getLogger } from "../LevertClient.js";

function addMsg(msg, trigger_id) {
    if(this.trackedMsgs.size >= this.trackLimit) {
        const [key] = this.trackedMsgs.keys();
        this.trackedMsgs.delete(key);
    }

    this.trackedMsgs.set(trigger_id, msg);
}

function deleteMsg(trigger_id) {
    if(!this.enabled) {
        return;
    }

    const sentMsg = this.trackedMsgs.get(trigger_id);
    
    if(typeof sentMsg === "undefined") {
        return;
    }

    return sentMsg;
}

class Handler {
    constructor(enabled = true, hasTracker = true) {
        this.enabled = enabled;

        if(enabled && hasTracker) {
            this.trackLimit = 100;
            this.trackedMsgs = new Map();

            this.addMsg = addMsg.bind(this);
            this.deleteMsg = deleteMsg.bind(this);
        }
    }

    async delete(msg) {
        const sentMsg = this.deleteMsg(msg.id);

        if(typeof sentMsg === "undefined") {
            return false;
        }

        if(sentMsg.constructor.name === "Array") {
            for(const sent of sentMsg) {
                try {
                    await sent.delete();
                } catch(err) {
                    getLogger().error("Could not delete message", err);
                }
            }
        } else {
            try {
                await sentMsg.delete();
            } catch(err) {
                getLogger().error("Could not delete message", err);
            }
        }

        return true;
    }

    async resubmit(msg) {
        await this.delete(msg);
        return this.execute(msg);
    }
}

export default Handler;
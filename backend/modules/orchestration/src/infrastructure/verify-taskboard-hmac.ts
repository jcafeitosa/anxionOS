export interface TaskboardHmacConfig {
    secret: string | null;
    required: boolean;
}

export {
    computeTaskboardHmac,
    resolveTaskboardHmacConfig,
    verifyTaskboardHmac,
} from "../domain/policies/taskboard-hmac";

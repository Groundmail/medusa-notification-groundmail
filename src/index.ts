import { ModuleProvider, Modules } from '@medusajs/framework/utils'
import { GroundmailNotificationService } from './service'

export { GroundmailNotificationService, toTemplateVariables, type GroundmailNotificationOptions } from './service'

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [GroundmailNotificationService],
})

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { DeepPartial, Mutable } from 'utility-types';
import { merge } from 'lodash';
import type { SearchResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type {
  SentinelOneGetActivitiesResponse,
  SentinelOneGetAgentsResponse,
  SentinelOneActivityRecord,
  SentinelOneOsType,
  SentinelOneGetRemoteScriptStatusApiResponse,
  SentinelOneRemoteScriptExecutionStatus,
} from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import { buildIndexNameWithNamespace } from '../utils/index_name_utilities';
import { EndpointActionGenerator } from './endpoint_action_generator';
import { SENTINEL_ONE_ACTIVITY_INDEX_PATTERN } from '../..';
import type {
  LogsEndpointAction,
  SentinelOneActivityEsDoc,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
  SentinelOneActivityDataForType80,
  SentinelOneAgentEsDoc,
} from '../types';
import { SENTINEL_ONE_AGENT_INDEX_PATTERN } from '../service/response_actions/sentinel_one';

export class SentinelOneDataGenerator extends EndpointActionGenerator {
  static readonly scriptExecutionStatusValues: Readonly<
    Array<SentinelOneRemoteScriptExecutionStatus['status']>
  > = Object.freeze([
    'canceled',
    'completed',
    'created',
    'expired',
    'failed',
    'in_progress',
    'partially_completed',
    'pending',
    'pending_user_action',
    'scheduled',
  ]);

  generate<
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = {}
  >(
    overrides: DeepPartial<LogsEndpointAction<TParameters, TOutputContent, TMeta>> = {}
  ): LogsEndpointAction<TParameters, TOutputContent, TMeta> {
    return super.generate(
      merge(
        {
          EndpointActions: {
            input_type: 'sentinel_one',
          },
        },
        overrides
      )
    ) as LogsEndpointAction<TParameters, TOutputContent, TMeta>;
  }

  /** Generate a SentinelOne activity index ES doc */
  generateActivityEsDoc<TData>(
    overrides: DeepPartial<SentinelOneActivityEsDoc> = {}
  ): SentinelOneActivityEsDoc<TData> {
    const doc: SentinelOneActivityEsDoc = {
      sentinel_one: {
        activity: {
          data: {},
          agent: {
            id: this.seededUUIDv4(),
          },
          updated_at: '2024-03-29T13:45:21.723Z',
          description: {
            primary: 'Some description here',
          },
          id: this.seededUUIDv4(),
          type: 1001,
        },
      },
    };

    return merge(doc, overrides) as SentinelOneActivityEsDoc<TData>;
  }

  generateActivityEsSearchHit<TData>(
    overrides: DeepPartial<SentinelOneActivityEsDoc<TData>> = {}
  ): SearchHit<SentinelOneActivityEsDoc<TData>> {
    const hit = this.toEsSearchHit<SentinelOneActivityEsDoc<TData>>(
      this.generateActivityEsDoc(overrides),
      SENTINEL_ONE_ACTIVITY_INDEX_PATTERN
    );

    hit.inner_hits = {
      first_found: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        hits: { hits: [this.toEsSearchHit(hit._source!, hit._index)] },
      },
    };

    return hit;
  }

  generateActivityEsSearchResponse<TData>(
    docs: Array<SearchHit<SentinelOneActivityEsDoc<TData>>> = [this.generateActivityEsSearchHit()]
  ): SearchResponse<SentinelOneActivityEsDoc<TData>> {
    return this.toEsSearchResponse<SentinelOneActivityEsDoc<TData>>(docs);
  }

  generateActivityFetchFileResponseData(
    overrides: DeepPartial<SentinelOneActivityDataForType80> = {}
  ): SentinelOneActivityDataForType80 {
    const data: SentinelOneActivityDataForType80 = {
      flattened: {
        commandId: Number([...this.randomNGenerator(1000, 2)].join('')),
        commandBatchUuid: this.seededUUIDv4(),
        filename: 'file.zip',
        sourceType: 'API',
        uploadedFilename: 'file_fetch.zip',
      },
      site: { name: 'Default site' },
      group_name: 'Default Group',
      scope: { level: 'Group', name: 'Default Group' },
      fullscope: {
        details: 'Group Default Group in Site Default site of Account Foo',
        details_path: 'Global / Foo / Default site / Default Group',
      },
      downloaded: {
        url: `/agents/${[...this.randomNGenerator(100, 4)].join('')}/uploads/${[
          ...this.randomNGenerator(100, 4),
        ].join('')}`,
      },
      account: { name: 'Foo' },
    };

    return merge(data, overrides);
  }

  generateSentinelOneApiActivityResponse(
    activityRecordOverrides: DeepPartial<Mutable<SentinelOneActivityRecord>> = {}
  ): SentinelOneGetActivitiesResponse {
    const today = new Date();
    today.setMinutes(today.getMinutes() - 5);
    const activityType = activityRecordOverrides.activityType ?? this.randomActivityType();
    const activity: SentinelOneActivityRecord = {
      accountId: this.randomString(10),
      accountName: 'Elastic',
      activityType,
      activityUuid: this.seededUUIDv4(),
      agentId: this.seededUUIDv4(),
      agentUpdatedVersion: null,
      comments: null,
      createdAt: today.toISOString(),
      data: this.generateActivityDataForType(activityType),
      description: null,
      groupId: '1392053568591146999',
      groupName: 'Default Group',
      hash: null,
      id: this.seededUUIDv4(),
      osFamily: null,
      primaryDescription: sentinelOneActivityTypes[activityType.toString()],
      secondaryDescription: 'IP address: 108.77.84.191',
      siteId: '1392053568582758390',
      siteName: 'Default site',
      threatId: null,
      updatedAt: today.toISOString(),
      userId: this.randomUser(),
    };

    return {
      data: [merge(activity, activityRecordOverrides)],
      pagination: {
        nextCursor: 'eyJpZF9jb2x9',
        totalItems: 1,
      },
    };
  }

  randomActivityType(): number {
    return Number(this.randomChoice(Object.keys(sentinelOneActivityTypes)));
  }

  generateActivityDataForType<TData extends Record<string, any> = {}>(
    activityType: number,
    overrides: Record<string, any> = {}
  ): SentinelOneActivityRecord<TData>['data'] {
    let activityData: Record<string, any> = {
      accountName: 'elastic',
      groupName: 'Default Group',
    };

    switch (activityType) {
      // File fetch requested
      case 81:
        {
          const ip = this.randomIP();
          activityData = {
            accountName: 'Elastic',
            commandBatchUuid: this.seededUUIDv4(),
            computerName: this.randomHostname(),
            externalIp: ip,
            fullScopeDetails: 'Group Default Group in Site Default site of Account Elastic',
            fullScopeDetailsPath: 'Global / Elastic / Default site / Default Group',
            groupName: 'Default Group',
            groupType: 'Manual',
            ipAddress: ip,
            scopeLevel: 'Group',
            scopeName: 'Default Group',
            siteName: 'Default site',
            username: 'Defend Workflows Automation',
            uuid: this.seededUUIDv4(),
          };
        }
        break;

      // File was successful retrieved from host (uploaded by host to sentinelone)
      case 80:
        activityData = {
          accountName: 'Elastic',
          commandBatchUuid: this.seededUUIDv4(),
          commandId: this.seededUUIDv4(),
          computerName: this.randomHostname(),
          downloadUrl: '/agents/1889978925339985309/uploads/1891428432577857502',
          externalIp: this.randomIP(),
          externalServiceId: null,
          filePath: '/agents/1889978925339985309/uploads/1891428432577857502',
          filename: 'file_9665_2024-02-23_16_10_39.663.zip',
          fullScopeDetails: 'Group Default Group in Site Default site of Account Elastic',
          fullScopeDetailsPath: 'Global / Elastic / Default site / Default Group',
          groupName: 'Default Group',
          ipAddress: null,
          realUser: null,
          scopeLevel: 'Group',
          scopeName: 'Default Group',
          siteName: 'Default site',
          sourceType: 'API',
          uploadedFilename: 'file_fetch_23-02-24_11_10_39.zip',
        };
        break;

      // Host was isolated (disconnected from network)
      case 1001:
        activityData = {
          accountName: 'Elastic',
          computerName: this.randomHostname(),
          fullScopeDetails: 'Group Default Group in Site Default site of Account Elastic',
          fullScopeDetailsPath: 'Global / Elastic / Default site / Default Group',
          groupName: 'Default Group',
          ipAddress: null,
          realUser: null,
          scopeLevel: 'Group',
          scopeName: 'Default Group',
          siteName: 'Default site',
          sourceType: 'API',
        };
        break;

      // Host was release (re-connected to the network)
      case 1002:
        activityData = {
          accountName: 'Elastic',
          computerName: this.randomHostname(),
          fullScopeDetails: 'Group Default Group in Site Default site of Account Elastic',
          fullScopeDetailsPath: 'Global / Elastic / Default site / Default Group',
          groupName: 'Default Group',
          ipAddress: null,
          realUser: null,
          scopeLevel: 'Group',
          scopeName: 'Default Group',
          siteName: 'Default site',
          sourceType: 'API',
        };
        break;
    }

    return activityData as SentinelOneActivityRecord<TData>['data'];
  }

  generateSentinelOneApiAgentsResponse(
    agentDetailsOverrides: DeepPartial<SentinelOneGetAgentsResponse['data'][number]> = {}
  ): SentinelOneGetAgentsResponse {
    const id = agentDetailsOverrides.id || agentDetailsOverrides.uuid || this.seededUUIDv4();

    const agent: SentinelOneGetAgentsResponse['data'][number] = {
      accountId: this.seededUUIDv4(),
      accountName: 'Elastic',
      activeDirectory: {
        computerDistinguishedName: null,
        computerMemberOf: [],
        lastUserDistinguishedName: null,
        lastUserMemberOf: [],
        mail: null,
        userPrincipalName: null,
      },
      activeThreats: 0,
      agentVersion: '23.4.2.14',
      allowRemoteShell: true,
      appsVulnerabilityStatus: 'not_applicable',
      cloudProviders: {},
      computerName: this.randomHostname(),
      consoleMigrationStatus: 'N/A',
      coreCount: 1,
      cpuCount: 1,
      cpuId: 'ARM Cortex-A72',
      createdAt: this.randomPastDate(),
      detectionState: null,
      domain: 'unknown',
      encryptedApplications: false,
      externalId: '',
      externalIp: this.randomIP(),
      firewallEnabled: false,
      firstFullModeTime: null,
      fullDiskScanLastUpdatedAt: this.randomPastDate(),
      groupId: '1392053568591146999',
      groupIp: '108.77.84.x',
      groupName: 'Default Group',
      id,
      inRemoteShellSession: false,
      infected: false,
      installerType: '.deb',
      isActive: true,
      isDecommissioned: false,
      isPendingUninstall: false,
      isUninstalled: false,
      isUpToDate: true,
      lastActiveDate: this.randomPastDate(),
      lastIpToMgmt: this.randomIP(),
      lastLoggedInUserName: '',
      licenseKey: '',
      locationEnabled: false,
      locationType: 'not_supported',
      locations: null,
      machineType: 'server',
      mitigationMode: 'detect',
      mitigationModeSuspicious: 'detect',
      modelName: 'QEMU QEMU Virtual Machine',
      policyUpdatedAt: null,
      groupUpdatedAt: null,
      networkInterfaces: [
        {
          gatewayIp: '192.168.64.1',
          gatewayMacAddress: 'be:d0:74:50:d8:64',
          id: '1913920934593053818',
          inet: ['192.168.64.2'],
          inet6: ['fdf4:f033:b1d4:8c51:5054:ff:fe5b:15e7'],
          name: 'enp0s1',
          physical: '52:54:00:5B:15:E7',
        },
      ],
      networkQuarantineEnabled: false,
      networkStatus: 'connected',
      operationalState: 'na',
      operationalStateExpiration: null,
      osArch: '64 bit',
      osName: 'Linux',
      osRevision: 'Ubuntu 22.04.4 LTS 5.15.0-102-generic',
      osStartTime: '2024-04-16T22:48:33Z',
      osType: 'linux',
      osUsername: 'root',
      rangerStatus: 'Enabled',
      rangerVersion: '23.4.1.1',
      registeredAt: '2024-03-25T16:59:14.860010Z',
      remoteProfilingState: 'disabled',
      remoteProfilingStateExpiration: null,
      scanAbortedAt: null,
      scanFinishedAt: '2024-03-25T17:21:43.371381Z',
      scanStartedAt: '2024-03-25T17:00:19.774123Z',
      scanStatus: 'finished',
      serialNumber: null,
      showAlertIcon: false,
      siteId: '1392053568582758390',
      siteName: 'Default site',
      storageName: null,
      storageType: null,
      tags: { sentinelone: [] },
      threatRebootRequired: false,
      totalMemory: 1966,
      updatedAt: this.randomPastDate(),
      userActionsNeeded: [],
      uuid: id,
    };

    return {
      pagination: { totalItems: 1, nextCursor: null },
      data: [merge(agent, agentDetailsOverrides)],
      errors: null,
    };
  }

  generateSentinelOneApiRemoteScriptStatusResponse(
    overrides: Partial<SentinelOneRemoteScriptExecutionStatus> = {}
  ): SentinelOneGetRemoteScriptStatusApiResponse {
    const scriptExecutionStatus: SentinelOneRemoteScriptExecutionStatus = {
      accountId: this.seededUUIDv4(),
      accountName: 'Elastic',
      agentComputerName: this.randomHostname(),
      agentId: this.seededUUIDv4(),
      agentIsActive: true,
      agentIsDecommissioned: false,
      agentMachineType: 'server',
      agentOsType: this.randomOSFamily() as SentinelOneOsType,
      agentUuid: this.seededUUIDv4(),
      createdAt: '2024-06-04T15:48:07.183909Z',
      description: 'Terminate Processes',
      detailedStatus: 'Execution completed successfully',
      groupId: '1392053568591146999',
      groupName: 'Default Group',
      id: this.seededUUIDv4(),
      initiatedBy: this.randomUser(),
      initiatedById: '1809444483386312727',
      parentTaskId: this.seededUUIDv4(),
      scriptResultsSignature: '632e6e027',
      siteId: '1392053568582758390',
      siteName: 'Default site',
      status: this.randomChoice(SentinelOneDataGenerator.scriptExecutionStatusValues),
      statusCode: 'ok',
      statusDescription: 'Completed',
      type: 'script_execution',
      updatedAt: '2024-06-04T15:49:20.508099Z',
    };

    return {
      data: [merge(scriptExecutionStatus, overrides)],
      pagination: { totalItems: 1, nextCursor: undefined },
    };
  }

  /**
   * Generate a SentinelOne Agent record that is ingested into Elasticsearch by the
   * integration into `logs-sentinel_one.agent-`
   */
  generateAgentEsDoc(overrides: DeepPartial<SentinelOneAgentEsDoc> = {}): SentinelOneAgentEsDoc {
    return merge(
      {
        agent: {
          id: '1-2-3',
          type: 'filebeat',
          version: '9.1.0',
        },
        sentinel_one: {
          agent: {
            agent: {
              id: 's1-agent-1',
            },
          },
        },
      },
      overrides
    );
  }

  generateAgentEsSearchHit(
    overrides: DeepPartial<SentinelOneAgentEsDoc> = {}
  ): SearchHit<SentinelOneAgentEsDoc> {
    return this.toEsSearchHit(
      this.generateAgentEsDoc(overrides),
      buildIndexNameWithNamespace(SENTINEL_ONE_AGENT_INDEX_PATTERN, 'default')
    );
  }

  generateAgentEsSearchResponse(
    docs: Array<SearchHit<SentinelOneAgentEsDoc>> = [this.generateAgentEsSearchHit()]
  ): SearchResponse<SentinelOneAgentEsDoc> {
    return this.toEsSearchResponse<SentinelOneAgentEsDoc>(docs);
  }
}

// Activity types from SentinelOne. Values can be retrieved from the SentineOne API at:
//  `/web/api/v2.1/activities/types`
const sentinelOneActivityTypes: Record<string, string> = {
  '2': 'Hash Defined as Malicious By Cloud',
  '5': 'Agent Software Update Downloaded',
  '6': '',
  '7': '',
  '8': '',
  '15': 'User Marked Agent As Up To Date',
  '16': 'Agent software updated',
  '17': 'Agent subscribed',
  '18': 'New Threat Mitigated',
  '19': 'New Malicious Threat Not Mitigated',
  '20': 'New Threat Preemptive Block',
  '21': 'Threat Resolved',
  '22': 'Threat Benign',
  '23': 'User Added',
  '24': 'User Modified',
  '25': 'User Deleted',
  '26': 'Management Updated',
  '27': 'User Logged In',
  '28': 'Activity Marked As Resolved By Cloud',
  '29': 'Activity Marked As Unresolved By Cloud',
  '30': '',
  '31': '',
  '32': '',
  '33': 'User Logged Out',
  '34': 'Threat Unresolved',
  '35': 'Verification email',
  '36': 'Verification complete',
  '37': 'User modified',
  '38': 'Immune Settings Modified',
  '39': 'Research Settings Modified',
  '40': 'Cloud Intelligence Settings Modified',
  '41': 'Learning Mode Settings Modified',
  '42': 'Global 2FA modified',
  '43': 'Agent updated',
  '44': 'Auto decommission On',
  '45': 'Auto decommission Off',
  '46': 'Auto Decommission Period Modified',
  '47': 'Agent Decommissioned',
  '48': 'Agent Recommissioned',
  '49': 'Agent Request Uninstall',
  '50': 'Uninstall Agent',
  '51': 'Agent Uninstalled',
  '52': 'User Approved Agent Uninstall Request',
  '53': 'User Rejected Agent Uninstall Request',
  '54': 'User Decommissioned Agent',
  '55': 'User Recommissioned Agent',
  '56': 'Auto Mitigation Actions Modified',
  '57': 'Quarantine Network Settings Modified',
  '58': 'Notification Option Level Modified',
  '59': 'Event Severity Level Modified',
  '60': 'Notification - Recipients Configuration Modified',
  '61': 'User Disconnected Agent From Network',
  '62': 'User Reconnected Agent to Network',
  '63': 'User Shutdown Agent',
  '64': 'User Requested Passphrase',
  '65': 'User Requested Full Log Report',
  '66': 'Agent Uploaded Full Log Report',
  '67': 'User 2FA Modified',
  '68': 'Engine Modified In Policy',
  '69': 'Mitigation Policy Modified',
  '70': 'Policy Setting - Agent Notification On Suspicious Modified',
  '71': 'Scan Initiated',
  '72': 'Scan Aborted',
  '73': 'Scan New Agents Changed',
  '74': 'Machine Restart',
  '75': 'On Access Modified',
  '76': 'Anti Tampering Modified',
  '77': 'Agent UI Settings Modified',
  '78': 'Snapshots Settings Modified',
  '79': 'Agent Logging Modified',
  '80': 'Agent Uploaded Fetched Files',
  '81': 'User Requested Fetch Files',
  '82': 'Monitor On Execute',
  '83': 'Monitor On Write',
  '84': 'Deep Visibility Settings Modified',
  '85': 'User Requested Fetch Threat File',
  '86': 'Agent Uploaded Threat File',
  '87': 'Remote Shell Settings Modified',
  '88': 'User Remote Shell Modified',
  '89': 'User Requested Randomized Agent UUID',
  '90': 'Agent Started Full Disk Scan',
  '91': 'Agent Aborted Full Disk Scan',
  '92': 'Agent Completed Full Disk Scan',
  '93': "User Reset Agent's Local Config",
  '94': 'User Moved Agent To Another Site',
  '95': 'User Moved Agent to Group',
  '96': 'User Moved Agent from Site',
  '97': 'User Commanded Agent To Move To Another Console',
  '98': 'Agent Was Not Moved To Another Console',
  '99': 'Agent Successfully Moved To Another Console',
  '101': "User Changed Agent's Customer Identifier",
  '102': 'User Deleted',
  '103': 'User Deleted',
  '104': 'Global licenses modified',
  '105': 'Deep Visibility Settings Modified',
  '106': 'User Commanded Agents To Move To Another Console',
  '107': 'User Created RBAC Role',
  '108': 'User Edited RBAC Role',
  '109': 'User Deleted RBAC Role',
  '110': 'Enable API Token Generation',
  '111': 'Disable API Token Generation',
  '112': 'API token Generated',
  '113': 'API Token Revoked',
  '114': 'API Token Revoked',
  '115': 'Windows Event Log Collection Modified',
  '116': 'Policy Settings Modified',
  '117': 'User Disabled Agent',
  '118': 'User Enabled Agent',
  '119': 'Agent Disabled',
  '120': 'Agent Enabled',
  '121': 'User Started Remote Profiling',
  '122': 'User Stopped Remote Profiling',
  '123': 'Remote Profiler Enabled',
  '124': 'Remote Profiler Disabled',
  '125': 'Disable Agent Error',
  '126': 'Agent Disabled',
  '127': 'Agent Disabled',
  '128': 'Agent Disabled Because of Database Corruption',
  '129': 'Allowed Domains Settings Changed',
  '130': 'Opt-in To EA program',
  '131': 'Opt-out From EA Program',
  '132': 'EA Platform Settings Changed',
  '133': 'Existing User Login Failure',
  '134': 'Unknown User Login',
  '135': 'Remote Profiler Completed',
  '136': 'Remote Profiler Failure',
  '137': 'Remote Profiler Upload Failure',
  '138': 'User Started an Unrestricted Session',
  '139': 'User Failed to Start an Unrestricted Session',
  '140': 'Service User creation',
  '141': 'Service User modification',
  '142': 'Service User deletion',
  '143': 'User Locked from Unrestricted Session',
  '144': 'User Temporarily Locked',
  '145': '2FA - Enroll',
  '146': '2FA - Reset',
  '147': '2FA - Configured',
  '148': '2FA - Delete',
  '150': 'Live Updates Policy Modified',
  '151': 'Live Updates Policy Inheritance Setting Changed',
  '160': 'Agent Update Pending User Action',
  '161': 'Agent Update Canceled',
  '162': 'Agent Update Failed',
  '163': '',
  '200': 'File Upload Settings Modified',
  '201': 'File Upload Enabled/Disabled',
  '203': 'User Downloaded File',
  '204': 'Scheduled Report Removed',
  '221': 'Threat Automatically Resolved',
  '701': 'User Created Policy Override',
  '702': 'User Updated Policy Override',
  '703': 'User Deleted Policy Override',
  '1001': 'Agent Disconnected From Network',
  '1002': 'Agent Reconnected To Network',
  '1023': 'SSO User Added',
  '1024': 'SSO User Modified',
  '1100': 'User Network Quarantine Container',
  '1101': 'User Network Unquarantine Container',
  '1102': 'User Network Quarantine Container',
  '1103': 'User Network Unquarantine Container',
  '1104': 'User Network Unquarantine Container',
  '1105': 'User Network Quarantine Container',
  '1501': 'Location Created',
  '1502': 'Location Copied',
  '1503': 'Location Modified',
  '1504': 'Location Deleted',
  '2001': 'Threat Mitigation Report Kill Success',
  '2002': 'Threat Mitigation Report Remediate Success',
  '2003': 'Threat Mitigation Report Rollback Success',
  '2004': 'Threat Mitigation Report Quarantine Success',
  '2005': '',
  '2006': 'Threat Mitigation Report Kill Failed',
  '2007': 'Threat Mitigation Report Remediate Failed',
  '2008': 'Threat Mitigation Report Rollback Failed',
  '2009': 'Threat Mitigation Report Quarantine Failed',
  '2010': 'Agent Mitigation Report Quarantine Network Failed',
  '2011': 'User Issued Kill Command',
  '2012': 'User Issued Remediate Command',
  '2013': 'User Issued Rollback Command',
  '2014': 'User Issued Quarantine Command',
  '2015': 'User Issued Unquarantine Command',
  '2016': 'User Marked Application As Threat',
  '2017': 'User Issued Remove Macros Command',
  '2018': 'User Issued Restore Macros Command',
  '2021': 'Threat Killed By Policy',
  '2022': 'Threat Remediated By Policy',
  '2023': 'Threat Rolled Back By Policy',
  '2024': 'Threat Quarantined By Policy',
  '2025': 'Agent Disconnected From Network Due to Threat Mitigation By Policy',
  '2026': 'Threat Mitigation Report Unquarantine Success',
  '2027': 'Threat Mitigation Report Unquarantine Failed',
  '2028': 'Threat Incident Status Changed',
  '2029': 'Ticket Number Changes',
  '2030': 'Analyst Verdict Changes',
  '2031': 'Threat Mitigation Report Kill Pending Reboot',
  '2032': 'Threat Mitigation Report Remediate Pending Reboot',
  '2033': 'Threat Mitigation Report Rollback Pending Reboot',
  '2034': 'Threat Mitigation Report Quarantine Pending Reboot',
  '2035': 'Threat Mitigation Report Unquarantine Pending Reboot',
  '2036': 'Threat Confidence Level Changed By Agent',
  '2037': 'Threat Confidence Level Changed By Cloud',
  '2038': 'Threat Mitigation Report Remove Macros Success',
  '2039': 'Threat Mitigation Report Remove Macros Failed',
  '2040': 'Threat Mitigation Report Restore Macros Success',
  '2041': 'Threat Mitigation Report Restore Macros Failed',
  '2042': 'Threat Mitigation Report Remove Macros Pending Reboot',
  '2043': 'Threat Mitigation Report Restore Macros Pending Reboot',
  '2100': 'Upgrade Policy - Concurrency Limit Changed',
  '2101': 'Upgrade Policy - Concurrency Limit Inheritance Changed',
  '2110': 'Upgrade Policy - Maintenance Window Time Changed',
  '2111': 'Upgrade Policy - Maintenance Window Time Inheritance Changed',
  '3001': 'User Added Hash Exclusion',
  '3002': 'User Added Blocklist Hash',
  '3003': '',
  '3004': '',
  '3005': 'Cloud Added Hash Exclusion',
  '3006': 'Cloud Added Blocklist Hash',
  '3007': '',
  '3008': 'New Path Exclusion',
  '3009': 'New Signer Identity Exclusion',
  '3010': 'New File Type Exclusion',
  '3011': 'New Browser Type Exclusion',
  '3012': 'Path Exclusion Modified',
  '3013': 'Signer Identity Exclusion Modified',
  '3014': 'File Type Exclusion Modified',
  '3015': 'Browser Type Exclusion Modified',
  '3016': 'Path Exclusion Deleted',
  '3017': 'Signer Identity Exclusion Deleted',
  '3018': 'File Type Exclusion Deleted',
  '3019': 'Browser Type Exclusion Deleted',
  '3020': 'User Deleted Hash From Blocklist',
  '3021': 'User Deleted Hash Exclusion',
  '3022': 'Cloud Deleted Hash Exclusion',
  '3023': 'Cloud Deleted Blocklist Hash',
  '3050': 'Identity Exclusion Created',
  '3051': 'Identity Exclusion Updated',
  '3052': 'Identity Exclusion Updated',
  '3100': 'User Added Package',
  '3101': 'User Modified Package',
  '3102': 'User Deleted Package',
  '3103': 'Package Deleted By System - Too Many Packages',
  '3200': 'User Started Remote Shell',
  '3201': 'Remote Shell Created',
  '3202': 'Remote Shell Failed',
  '3203': 'Remote Shell Terminated',
  '3204': 'Remote Shell Terminated By User',
  '3400': 'Agent Uploaded Remote Shell history',
  '3500': 'User Toggled Ranger Status',
  '3501': 'Ranger Settings Modified',
  '3502': 'Ranger Network Settings Modified',
  '3503': 'Ranger - Inventory Scan Completed',
  '3505': 'Ranger - Devices Discovered',
  '3506': 'Ranger - Device Review Modified',
  '3507': 'Ranger - Device Tag Modified On Host',
  '3520': 'Ranger Deploy - Master passphrase',
  '3521': 'Ranger Deploy Initiated',
  '3522': 'Ranger Deploy - Credential Group Created',
  '3523': 'Ranger Deploy -Credential Group Edited',
  '3524': 'Ranger Deploy - Credential Group Deleted',
  '3525': 'Ranger Deploy - Credential Created',
  '3526': 'Ranger Deploy - Credential Deleted',
  '3527': 'Ranger Deploy - Credential Overridden',
  '3530': 'Ranger Labels Updated',
  '3531': 'Ranger labels reverted',
  '3532': 'Ranger Deploy - Trusted Hosts',
  '3533': 'Ranger Deploy - Linux Enforcement',
  '3534': 'Ranger Deploy - PsDrive WMI Session',
  '3600': 'Custom Rules - User Created A Rule',
  '3601': 'Custom Rules - User Changed A Rule',
  '3602': 'Custom Rules - User Deleted A Rule',
  '3603': 'Custom Rules - Rule Status Changed',
  '3604': 'Custom Rules - Rule Status Change Failed',
  '3605': 'Custom Rules - Rule Will Expire Soon',
  '3606': 'Custom Rules - Rule Expired',
  '3607': 'Custom Rules - Rule Reached Alert Limit',
  '3608': 'Custom Rules - New Alert',
  '3610': 'Account Uninstall Password Viewed',
  '3611': 'Account Uninstall Password Generated',
  '3612': 'Account Uninstall Password Regenerated',
  '3613': 'Account Uninstall Password Revoked',
  '3614': 'Agent Started On-Demand Disk Scan',
  '3615': 'Agent Aborted On-Demand Scan',
  '3616': 'New Script Created',
  '3617': 'Agent Completed On-Demand Scan',
  '3618': 'Script Action Initiated',
  '3620': 'Manual CIS Scan Initiated',
  '3621': 'Manual CIS scan Completed',
  '3622': 'Script Deleted',
  '3623': 'Script Updated',
  '3624': 'User 2FA Verification Success',
  '3625': 'User 2FA Verification Failed',
  '3626': 'User 2FA Email Verification Changed',
  '3627': 'User 2FA Verification Sent',
  '3628': '2FA Code Verification',
  '3629': 'Login Using Saved 2FA Recovery Code',
  '3630': 'Live Update Sent To Agent',
  '3631': 'Live Update Merged To Agent',
  '3632': 'Live Update Not Merged To Agent',
  '3633': 'Marketplace - App Installed',
  '3634': 'Marketplace - App Deleted',
  '3635': 'Marketplace - App Disabled',
  '3636': 'Marketplace - App Enabled',
  '3637': 'Marketplace - App Edit',
  '3638': 'Marketplace - App Disabled Error',
  '3639': 'Marketplace - App Disabled Error',
  '3640': 'Ranger Self Provisioning',
  '3641': 'Ranger self Provisioning Default Features Modified',
  '3642': 'Ranger Self Provisioning Site Features Change',
  '3650': 'Tag Manager - User Created New Tag',
  '3651': 'Tag Manager - User Modified Tag',
  '3652': 'Tag Manager - User Deleted Tag',
  '3653': 'Tag Manager - User Attached Tag',
  '3654': 'Tag Manager - User Detached Tag',
  '3655': 'Tag Detached Because Tag Deleted',
  '3656': 'Tag Manager - Tag Detached Because Scope Changed',
  '3660': 'Vulnerability scan triggered',
  '3661': 'User Add Missing CVE To Application',
  '3662': 'User Marked CVE as False Positive on Application',
  '3663': 'User created a vulnerability ticket',
  '3664': 'User Enabled Extensive Scan',
  '3665': 'User Disabled Extensive Scan',
  '3666': 'User Enabled Linux Extensive Scan',
  '3667': 'User Disabled Linux Extensive Scan',
  '3668': 'User Enabled Vulnerability Scan',
  '3669': 'User Disabled Vulnerability Scan',
  '3670': 'User Modified Inheritance',
  '3701': 'XDR - User Initiated Action',
  '3702': 'XDR - Application Action Response',
  '3710': 'User Reset Password with Forgot Password from the Login',
  '3711': 'User Changed Their Password',
  '3712': 'Prompt Reset Password',
  '3714': 'User Changed Their Password Due To Expiration',
  '3715': 'User Reset Password by Admin Request',
  '3720': 'CIS Skip Created',
  '3721': 'CIS Skip Deleted',
  '3730': 'User Requested Set Password On Next Login',
  '3750': 'Auto-Upgrade Policy Created',
  '3751': 'Auto-Upgrade Policy Disabled',
  '3752': 'Auto-Upgrade Policy Activated',
  '3753': 'Auto-Upgrade Policy Deleted',
  '3754': 'Auto-Upgrade Policy Reordered',
  '3755': 'Upgrade Policy Inheritance Setting Changed',
  '3756': 'Auto-Upgrade Policy Edited',
  '3757': 'Custom Rules - New Alert',
  '3767': 'Local Upgrade Authorized',
  '3768': 'Local Upgrade Authorized',
  '3769': 'Local Upgrade Authorized',
  '3770': 'Local Upgrade Authorization Expiry Date Changed',
  '3771': 'Local Upgrade Authorization Expiry Date Changed',
  '3772': 'Local Upgrade Unauthorized',
  '3773': 'Local Upgrade Authorization Inherits from Site Level',
  '3774': 'Local Upgrade Authorization Inherits from Site Level',
  '3775': 'Downloaded list of authorized agents',
  '4001': 'Suspicious Threat Was Marked As Threat',
  '4002': 'Suspicious Threat Was Resolved',
  '4003': 'New Suspicious Threat Not Mitigated',
  '4004': 'Policy Setting - Show Suspicious Activities Configuration Enabled',
  '4005': 'Policy Setting - Show Suspicious Activities Configuration Disabled',
  '4006': 'Session Timeout Timeout Modified',
  '4007': 'Suspicious Threat Was Marked As Benign',
  '4008': 'Threat Mitigation Status Changed',
  '4009': 'Process Was Marked As Threat',
  '4010': '',
  '4011': 'Suspicious Threat Was Unresolved',
  '4012': 'UI Inactivity Timeout Modified',
  '4013': 'Password Expiration Modified',
  '4020': 'New Threat Note Added',
  '4021': 'Threat Note Updated',
  '4022': 'Threat Note Deleted',
  '4100': 'User Marked Deep Visibility Event As Threat',
  '4101': 'User Marked Deep Visibility Event As Suspicious',
  '4102': 'Agent Failed To Mark Deep Visibility Event As Threat',
  '4103': 'Agent Failed To Mark Deep Visibility Event As Suspicious',
  '4104': 'STAR Manual Response Marked Event As Malicious',
  '4105': 'STAR Manual Response Marked Event As Suspicious',
  '4106': 'STAR Active Response Marked Event As Malicious',
  '4107': 'STAR Active Response Marked Event As Suspicious',
  '4108': 'New Malicious Threat Not Mitigated',
  '4109': 'New Suspicious Threat Not Mitigated',
  '4110': 'Singularity Threat Intelligence Engine Marked Event As Malicious',
  '4111': 'Watchtower Cloud Detection Engine Marked Event As Threat',
  '4112': 'Watchtower Cloud Detection Engine Marked Event As Suspicious',
  '4113': 'Singularity Threat Intelligence Engine Marked Event As Suspicious',
  '5000': 'AD Sync Started',
  '5001': 'AD Sync Finished',
  '5002': 'Dynamic Group Creation Started',
  '5003': 'Dynamic Group Creation Finished',
  '5004': 'Dynamic Group Update Started',
  '5005': 'Dynamic Group Update Finished',
  '5006': 'Group Deleted',
  '5007': 'Group Info Changed',
  '5008': 'User created a Manual or Pinned Group',
  '5009': 'Agent Moved To A Different Group',
  '5010': 'Group Ranking Changed',
  '5011': 'Group Policy Reverted',
  '5012': 'Group Token Regenerated',
  '5013': 'Group Deleted Because Site Deleted',
  '5020': 'Site Created',
  '5021': 'Site Modified',
  '5022': 'Site Deleted',
  '5023': 'Site Expired',
  '5024': 'Site Policy Reverted',
  '5025': 'Site Marked As Expired',
  '5026': 'Site Duplicated',
  '5027': 'Site Token Regenerated',
  '5028': 'Site Expired Because Account Expired',
  '5029': 'Site Deleted Because Account Deleted',
  '5040': 'Account Created',
  '5041': 'Account Modified',
  '5042': 'Account Deleted',
  '5043': 'Account Expired',
  '5044': 'Account Policy Reverted',
  '5045': 'Account Marked As Expired',
  '5120': 'Device Rule Created',
  '5121': 'Device Rule Modified',
  '5122': 'Device Rule Deleted',
  '5123': 'Device Rules Reordered',
  '5124': 'Device Rules Settings Modified',
  '5125': 'Device Control Blocked Event',
  '5126': 'Device Control Approved Event',
  '5127': 'Device Rule Moved From Scope',
  '5128': 'Device Rule Moved To Scope',
  '5129': 'Device Rule Copied To Scope',
  '5220': 'Firewall Rule Created',
  '5221': 'Firewall Rule Modified',
  '5222': 'Firewall Rule Deleted',
  '5225': 'Firewall Control Settings Modified',
  '5226': 'Firewall Rules Reordered',
  '5227': 'User Initiated Fetch Firewall Rules From Agent',
  '5228': 'Agent Uploaded Firewall Rules',
  '5229': 'Firewall Rule Moved From Scope',
  '5230': 'Firewall Rule Moved To Scope',
  '5231': 'Firewall Rule Copied To Scope',
  '5232': 'Firewall Control Blocked Event',
  '5233': 'User Requested Firewall Logging',
  '5234': 'Network Quarantine Rule Created',
  '5235': 'Network Quarantine Rule Modified',
  '5236': 'Network Quarantine Rule Deleted',
  '5237': 'Network Quarantine Control Settings Modified',
  '5238': 'Network Quarantine Rules Reordered',
  '5239': 'Network Quarantine Rule Moved From Scope',
  '5240': 'Network Quarantine Rule Moved To Scope',
  '5241': 'Network Quarantine Rule Copied To Scope',
  '5242': 'Ranger - Device Tag Created',
  '5243': 'Ranger - Device Tag Updated',
  '5244': 'Ranger - Device Tag Deleted',
  '5250': 'Firewall Control Tag Created',
  '5251': 'Firewall Control Tag Updated',
  '5252': 'Firewall Control Tag Updated',
  '5253': 'Network Quarantine Control Tag Created',
  '5254': 'Network Quarantine Control Tag Updated',
  '5255': 'Network Quarantine Control Tag Deleted',
  '5256': 'Firewall Control Tag Added/Removed From Rule',
  '5257': 'Firewall Control Tag Inherited',
  '5258': 'Network Quarantine Control Tag Added/Removed From Rule',
  '5259': 'Network Quarantine Control Tag Inherited',
  '6000': 'Mobile Policy updated',
  '6001': 'Mobile Policy created',
  '6002': 'Mobile Policy removed',
  '6010': 'UEM Connection created',
  '6011': 'UEM Connection updated',
  '6012': 'UEM Connection Removed',
  '6013': 'UEM Connection Synced',
  '6030': 'Mobile Device Updated',
  '6031': 'Mobile Device Created',
  '6032': 'Mobile Device Removed',
  '6050': 'Mobile Incident Detected',
  '6051': 'Mobile Incident Mitigated',
  '6052': 'Mobile Incident Automatically Resolved',
  '6053': 'Mobile Incident Resolved',
  '6054': 'Mobile Incident Status Changed',
  '6055': 'Mobile Incident Analyst Verdict Changed',
  '6999': 'Unknown mobile activity',
  '7100': 'Exclusion import',
  '7101': 'Blacklist import',
  '7200': 'Add cloud account',
  '7201': 'Disable cloud Account',
  '7202': 'Enable cloud Account',
  '7203': 'Disable and Purge cloud (AKA Delete)',
  '7210': 'Add cloud policy',
  '7211': 'Update cloud policy',
  '7212': 'Delete cloud policy',
  '7500': 'Remote Ops Password Configured',
  '7501': 'Remote Ops Password Deleted',
  '7502': 'Forensics Profile Executed',
  '7503': 'Forensics Profile Created',
  '7504': 'Forensics Profile Modified',
  '7505': 'Forensics Profile Deleted',
  '7600': 'User Submitted Script Execution For Review',
  '7601': 'User Approved Script Execution',
  '7602': 'User Edited Run Script Guardrails',
  '7603': 'User Enabled Run Script Guardrails',
  '7604': 'User Disabled Run Script Guardrails',
  '7700': 'User Added New AD configuration',
  '7701': 'User Updated AD configuration',
  '7702': 'User Deleted AD configuration',
  '7800': 'User Deployed AD Connector',
  '7801': 'User Updated AD Connector',
  '7802': 'User Deleted AD Connector',
  '7830': 'Ranger AD Scan Completed',
  '7831': 'AD Assessment Detected New Exposure',
  '7853': 'User Triggered AD Exposure Assessment',
  '7854': 'User Exported AD Exposure',
  '7855': 'User Performed AD Exposure Skip',
  '7856': 'User Performed AD Exposure Unskip',
  '7857': 'User Performed AD Exposure Ack',
  '7858': 'User Performed AD Exposure Unack',
  '7860': 'User Created Mitigation Task',
  '7861': 'User Created Mitigation Task',
  '7862': 'User Downloaded Mitigation Script',
  '7863': 'User Ran Mitigation Script',
  '7870': 'User updated application status',
  '7871': 'User updated application with spesific version status',
  '7872': 'User updated application status',
  '7900': 'Vigilance Response Policy Modified',
  '7901': 'Vigilance Response Policy Inheritance Modified',
  '7902': 'Vigilance Escalation Contacts Modified',
  '7903': 'Vigilance Escalation Contacts Inheritance Modified',
  '8001': 'Sign SAML Request - Enabled / Disabled',
  '8002': 'Accessing Protected Actions Configuration',
  '9001': 'User Added Deep Visibility Exclusion',
  '9002': 'User Deleted Deep Visibility Exclusion',
  '10000': 'Agent Failed To Move To Another Console',
};

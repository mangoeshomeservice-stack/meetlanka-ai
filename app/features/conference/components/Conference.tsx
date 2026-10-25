
import {
    initPopupsConfigurationRender,
    setupPictureInPictureRender,
    setupPowerMonitorRender,
    setupRemoteControlRender,
    setupScreenSharingRender
} from '@jitsi/electron-sdk/renderer';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import styled from 'styled-components';

import i18n from '../../../i18n';
import type { IConference, IState } from '../../../types';
import config from '../../config';
import { getSetting } from '../../settings';
import Spinner from '../../shared/components/Spinner';
import { parseURLParams } from '../../utils/parseURLParams';
import { conferenceEnded, conferenceJoined } from '../actions';
import JitsiMeetExternalAPI from '../external_api';
import { LoadingIndicator, Wrapper } from '../styled';

const MeetingShell = styled.div`
    background: #08142b;
    display: flex;
    flex-direction: column;
    height: 100vh;
    min-height: 0;
    overflow: hidden;
`;

const MeetingHeader = styled.header`
    align-items: center;
    background: linear-gradient(100deg, #091733, #162d64);
    border-bottom: 1px solid #34528a;
    box-sizing: border-box;
    color: white;
    display: flex;
    font-family: Arial, sans-serif;
    flex-shrink: 0;
    gap: 14px;
    min-height: 58px;
    justify-content: space-between;
    padding: 0 22px;
`;

const MeetingBrand = styled.strong`
    font-size: 22px;
    letter-spacing: 0.5px;
    span { color: #39c9f5; }
`;

const MeetingInfo = styled.span`
    color: #b9d1f0;
    font-size: 13px;
    white-space: nowrap;
`;

const HostNotice = styled.div`
    background: #132c53;
    border-bottom: 1px solid #34528a;
    color: #dcecff;
    font-family: Arial, sans-serif;
    font-size: 12px;
    flex-shrink: 0;
    line-height: 1.4;
    padding: 9px 22px;
    a { color: #57d6ff; }
`;

const MeetingFrame = styled.div`
    flex: 1;
    min-height: 0;
    overflow: hidden;
`;

const ControlBar = styled.div`
    align-items: center;
    background: #0b1d3b;
    border-top: 1px solid #34528a;
    display: flex;
    flex-shrink: 0;
    gap: 10px;
    min-height: 68px;
    justify-content: flex-start;
    overflow-x: auto;
    padding: 8px 16px;
    box-sizing: border-box;
    white-space: nowrap;
`;

const ControlButton = styled.button`
    background: linear-gradient(130deg, #1b3765, #214d80);
    border: 1px solid #4368a1;
    border-radius: 12px;
    color: white;
    flex-shrink: 0;
    cursor: pointer;
    font-size: 12px;
    padding: 11px 14px;
    transition: background 0.15s ease;
    &:hover:not(:disabled) { background: #2b5595; }
    &:focus-visible { outline: 2px solid #59d7ff; outline-offset: 2px; }
    &:disabled { cursor: not-allowed; opacity: 0.45; }
`;

interface IProps {
    _alwaysOnTopWindowEnabled?: boolean;
    _disableAGC?: boolean;
    _serverTimeout?: number;
    _serverURL?: string;
    conference: IConference;
    dispatch: Dispatch;
}

interface IConferenceState {
    audioMuted: boolean;
    isLoading: boolean;
    isModerator: boolean;
    joined: boolean;
    notice: string;
    videoMuted: boolean;
}

/**
 * Conference component.
 */
class Conference extends Component<IProps, IConferenceState> {
    _ref = React.createRef<HTMLDivElement>();
    _api?: JitsiMeetExternalAPI;
    _conference!: { room: string; serverURL: string; };
    _iframeLoaded?: boolean;

    /**
     * Initializes a new {@code Conference} instance.
     *
     * @inheritdoc
     */
    constructor(props: IProps) {
        super(props);

        this.state = {
            isLoading: true,
            joined: false,
            audioMuted: false,
            videoMuted: false,
            notice: '',
            isModerator: false
        };

        this._ref = React.createRef();

        this._onIframeLoad = this._onIframeLoad.bind(this);
        this._onVideoConferenceEnded = this._onVideoConferenceEnded.bind(this);
    }

    /**
     * Attach the script to this component.
     *
     * @returns {void}
     */
    componentDidMount() {
        const room = this.props.conference.room;
        const serverURL = this.props.conference.serverURL
            || this.props._serverURL
            || config.defaultServerURL;

        this._conference = {
            room,
            serverURL
        };

        this.setState({ joined: false, isLoading: true, notice: '', isModerator: false });
        this._loadConference();

    }

    /**
     * Remove conference on unmounting.
     *
     * @returns {void}
     */
    componentWillUnmount() {

        if (this._api) {
            this._api.dispose();
        }
    }

    /**
     * Handle joining another another meeing while in one.
     *
     * @param {Object} prevProps - The previous props.
     * @returns {void}
     */
    componentDidUpdate(prevProps: IProps) {
        const prevConference = prevProps.conference || {};
        const currentConference = this.props.conference || {};

        if (prevConference.room !== currentConference.room
            || prevConference.serverURL !== currentConference.serverURL) {

            // Simulate a re-mount so the new meeting is joined.
            this._iframeLoaded = false;
            this.componentWillUnmount();
            this.componentDidMount();
        }
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @returns {ReactElement}
     */
    render() {
        return (
            <MeetingShell>
                <MeetingHeader>
                    <MeetingBrand>MEET <span>UP</span></MeetingBrand>
                    <MeetingInfo>{this.state.joined ? (this.state.isModerator ? 'Connected · Moderator' : 'Connected · Participant') : 'Waiting to join'}</MeetingInfo>
                </MeetingHeader>
                <HostNotice>
                    On meet.jit.si, hosts may need to sign in. Meeting passwords and lobby controls are managed by Jitsi moderators, not by MEET UP.
                </HostNotice>
                <MeetingFrame>
                    <Wrapper innerRef = { this._ref }>
                        {this._maybeRenderLoadingIndicator()}
                    </Wrapper>
                </MeetingFrame>
                <ControlBar aria-label = 'MEET UP meeting controls' role = 'toolbar'>
                    <MeetingInfo>Mic · Camera · Speaker: use Jitsi's device settings (gear icon) inside the meeting.</MeetingInfo>
                    <ControlButton disabled = { !this.state.joined } onClick = { () => this._api?.executeCommand('toggleShareScreen') }>Share Screen</ControlButton>
                    <ControlButton disabled = { !this.state.joined } onClick = { () => this._api?.executeCommand('toggleChat') }>Chat</ControlButton>
                    <ControlButton disabled = { !this.state.joined } onClick = { () => this._api?.executeCommand('toggleParticipantsPane') }>Participants</ControlButton>
                    <ControlButton disabled = { !this.state.joined || !this.state.isModerator } onClick = { () => this._api?.executeCommand('toggleSecurityDialog') }>Security Settings</ControlButton>
                    <ControlButton onClick = { () => this._copyMeetingLink() }>Copy Invite Link</ControlButton>
                    <ControlButton disabled = { !this.state.joined } onClick = { () => this._api?.executeCommand('hangup') }>Leave Meeting</ControlButton>
                    <MeetingInfo role = 'status'>{this.state.notice}</MeetingInfo>
                </ControlBar>
            </MeetingShell>
        );
    }

    /**
     * Load the conference by creating the iframe element in this component
     * and attaching utils from jitsi-meet-electron-utils.
     *
     * @returns {void}
     */
    _loadConference() {
        const appProtocolSurplus = `${config.appProtocolPrefix}://`;

        // replace the custom url with https, otherwise new URL() raises 'Invalid URL'.
        if (this._conference.serverURL.startsWith(appProtocolSurplus)) {
            this._conference.serverURL = this._conference.serverURL.replace(appProtocolSurplus, 'https://');
        }
        const url = new URL(this._conference.room, this._conference.serverURL);
        const roomName = url.pathname.split('/').pop();
        const host = this._conference.serverURL.replace(/https?:\/\//, '');
        const searchParameters = Object.fromEntries(url.searchParams);
        const hashParameters = parseURLParams(url);

        const { jwt: jwtFromSearch, ...restSearchParameters } = searchParameters;
        const locale = { lng: i18n.language };
        const urlParameters = {
            ...restSearchParameters,
            ...locale
        };


        const configOverwrite: Record<string, any> = {
            enableCalendarIntegration: false,
            disableAGC: this.props._disableAGC,
            prejoinConfig: {
                enabled: true
            }
        };

        const interfaceConfigOverwrite = {
            SHOW_CHROME_EXTENSION_BANNER: false
        };
        // Keep Jitsi's native device selection and mic/camera controls in the iframe.
        // Avoid duplicating audio/video controls in the outer MEET UP toolbar.
        const displayName = (() => {
            try {
                return localStorage.getItem('meet-up-display-name')?.trim() || '';
            } catch (error) {
                return '';
            }
        })();
        let jwt = jwtFromSearch;

        Object.entries(hashParameters).forEach(([ key, value ]) => {
            if (key.startsWith('config.')) {
                const configKey = key.substring('config.'.length);

                configOverwrite[configKey] = value;
            } else if (key === 'jwt') {
                jwt = value;
            }
        });

        const options = {
            configOverwrite,
            interfaceConfigOverwrite,
            jwt,
            parentNode: this._ref.current,
            roomName,
            userInfo: { displayName },
            sandbox: 'allow-scripts allow-same-origin allow-popups allow-forms allow-downloads'
        };

        this._api = new JitsiMeetExternalAPI(host, {
            ...options,
            ...urlParameters
        });

        // This event is fired really early, at the same time as 'ready', but has been
        // around for longer.
        // TODO: remove after a while. -saghul
        this._api.on('browserSupport', this._onIframeLoad);

        this._api.on('suspendDetected', this._onVideoConferenceEnded);
        this._api.on('readyToClose', this._onVideoConferenceEnded);
        this._api.on('pipLeft', () => {
            window.jitsiElectronApp.ipc.send('restore-meeting-window');
        });
        this._api.on('videoConferenceJoined',
            () => {
                this.setState({ joined: true, notice: '' });
                this.props.dispatch(conferenceJoined(this._conference));
            }
        );
        this._api.on('audioMuteStatusChanged', ({ muted }: { muted: boolean; }) => {
            this.setState({ audioMuted: muted });
        });
        this._api.on('videoMuteStatusChanged', ({ muted }: { muted: boolean; }) => {
            this.setState({ videoMuted: muted });
        });
        this._api.on('videoConferenceLeft', () => {
            this.setState({ joined: false, isModerator: false });
        });
        this._api.on('participantRoleChanged', ({ id, role }: { id?: string; role?: string; }) => {
            // Jitsi sends role changes for participants; check local role through the API.
            if (role && id && id === this._api?.getMyUserId()) {
                this.setState({ isModerator: role === 'moderator' });
            }
        });
        this._api.on('passwordRequired', () => {
            this.setState({ notice: 'Meeting password required. Enter it in the Jitsi dialog.' });
        });
        this._api.on('errorOccurred', () => {
            this.setState({ notice: 'Meeting error. Check your connection or try joining again.' });
        });

        // Setup Jitsi Meet Electron SDK on this renderer. These run in the page
        // ("main world") next to the iframe API and reach the main process only
        // through the window.jitsiElectronSDK bridge installed by the SDK preload.
        initPopupsConfigurationRender(this._api);
        setupScreenSharingRender(this._api);
        setupRemoteControlRender(this._api);
        if (this.props._alwaysOnTopWindowEnabled) {
            setupPictureInPictureRender(this._api);
        }
        setupPowerMonitorRender(this._api);
    }

    /**
     * It renders a loading indicator, if appropriate.
     *
     * @returns {?ReactElement}
     */
    _maybeRenderLoadingIndicator() {
        if (this.state.isLoading) {
            return (
                <LoadingIndicator>
                    <Spinner size = 'large' />
                </LoadingIndicator>
            );
        }
    }

    /**
     * Dispatches conference ended and closes the meeting window (Window 2).
     *
     * @returns {void}
     * @private
     */
    async _copyMeetingLink() {
        const link = new URL(this._conference.room, this._conference.serverURL).href;

        try {
            await navigator.clipboard.writeText(link);
            this.setState({ notice: 'Invite link copied' });
        } catch (error) {
            console.error('Could not copy invite link', error);
            this.setState({ notice: 'Copy link unavailable; use the meeting invite menu' });
        }
    }

    _onVideoConferenceEnded() {
        this.props.dispatch(conferenceEnded(this._conference));
        window.jitsiElectronApp.ipc.send('close-meeting-window');
    }


    /**
     * Sets state of loading to false when iframe has completely loaded.
     *
     * @returns {void}
     */
    _onIframeLoad() {
        if (this._iframeLoaded) {
            // Skip spurious event after meeting close.
            return;
        }

        console.log('IFrame loaded');

        this._iframeLoaded = true;


        this.setState({
            isLoading: false
        });
    }
}

/**
 * Maps (parts of) the redux state to the React props.
 *
 * @param {Object} state - The redux state.
 * @returns {Props}
 */
function _mapStateToProps(state: IState) {
    return {
        _alwaysOnTopWindowEnabled: getSetting(state, 'alwaysOnTopWindowEnabled', true),
        _disableAGC: state.settings.disableAGC,
        _serverURL: state.settings.serverURL,
        _serverTimeout: state.settings.serverTimeout
    };
}

export default connect(_mapStateToProps)(Conference);


import { generateRoomWithoutSeparator } from '@jitsi/js-utils/random';
import React, { Component } from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { Dispatch, compose } from 'redux';
import styled from 'styled-components';

import type { IState } from '../../../types';
import config from '../../config';
import { Navbar } from '../../navbar';
import { RecentList, addRecentListEntry } from '../../recent-list';
import Button from '../../shared/components/Button';
import FieldText from '../../shared/components/FieldText';
import Page from '../../shared/components/Page';
import { createConferenceObjectFromURL } from '../../utils';
import { Body, Form, Header, Label, Wrapper } from '../styled';


const MainFieldText = styled(FieldText)`
    flex: 1;
    min-width: 0;
    input {
        background: rgba(5, 16, 40, 0.75);
        border: 1px solid #6586b7;
        border-radius: 13px;
        box-sizing: border-box;
        color: white;
        font-size: 17px;
        height: 62px;
        padding: 0 20px;
    }
    input:focus { border-color: #28c4ff; outline: 2px solid #286dff55; }
`;

const MainGoButton = styled(Button)`
    background: linear-gradient(115deg, #06b6ed, #2156f5);
    border: 0;
    border-radius: 13px;
    font-size: 16px;
    font-weight: 700;
    height: 62px;
    min-width: 210px;
    &:hover { filter: brightness(1.15); }
`;

const Hero = styled.main`
    align-items: center;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 80vh;
    padding: 48px 28px;
    position: relative;
    text-align: center;
    z-index: 1;
`;

const Brand = styled.div`
    align-items: center;
    display: flex;
    gap: 18px;
    justify-content: center;
    margin-bottom: 30px;
`;

const BrandName = styled.div`
    color: white;
    font-size: 52px;
    font-weight: 900;
    letter-spacing: -2px;
    span { background: linear-gradient(90deg, #06d7ed, #b33cff); background-clip: text; -webkit-text-fill-color: transparent; }
`;

const HeroTitle = styled.h1`
    color: #fff;
    font-size: clamp(38px, 5vw, 66px);
    font-weight: 850;
    letter-spacing: -2px;
    line-height: 1.13;
    margin: 0 0 20px;
    span { background: linear-gradient(100deg, #b85bff, #06c9ff); background-clip: text; -webkit-text-fill-color: transparent; }
`;

const HeroDescription = styled.p`
    color: #d7e2f4;
    font-size: 20px;
    line-height: 1.5;
    margin: 0 0 32px;
`;

const FeatureStrip = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    justify-content: center;
    margin-top: 42px;
    width: 100%;
`;

const FeatureCard = styled.div`
    background: #0e2452a8;
    border: 1px solid #2963bb66;
    border-radius: 20px;
    box-sizing: border-box;
    color: white;
    font-size: 15px;
    font-weight: 600;
    min-width: 185px;
    padding: 24px;
    span { color: #36adff; display: block; font-size: 30px; margin-bottom: 10px; }
`;

const QuickActions = styled.div`
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin: 8px 0 24px;
    max-width: 950px;
    width: 100%;
    @media (max-width: 780px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
`;

const QuickAction = styled.button`
    background: rgba(20, 48, 100, 0.8);
    border: 1px solid #3973c7;
    border-radius: 18px;
    color: #fff;
    cursor: pointer;
    font-size: 15px;
    font-weight: 700;
    min-height: 112px;
    padding: 16px 10px;
    &:hover { background: #2453a0; }
    &:disabled { cursor: not-allowed; opacity: 0.55; }
    span { color: #4bcaff; display: block; font-size: 28px; margin-bottom: 10px; }
`;

const MeetingPanel = styled.div`
    background: #14306485;
    border: 1px solid #398cff;
    border-radius: 22px;
    box-sizing: border-box;
    max-width: 950px;
    padding: 24px;
    width: 100%;
`;

const BrandMark = () => (
    <svg aria-label = 'MEET UP logo' height = '95' viewBox = '0 0 110 100' width = '105'>
        <defs>
            <linearGradient id = 'meetupMarkGradient' x1 = '0' x2 = '1' y1 = '1' y2 = '0'>
                <stop offset = '0%' stopColor = '#00dce9' />
                <stop offset = '50%' stopColor = '#2563ff' />
                <stop offset = '100%' stopColor = '#e13df5' />
            </linearGradient>
        </defs>
        <path d = 'M12 81 V21 Q12 9 24 18 L54 46 L83 18 Q96 8 96 25 V81' fill = 'none' stroke = 'url(#meetupMarkGradient)' strokeLinecap = 'round' strokeLinejoin = 'round' strokeWidth = '17' />
        <path d = 'M5 78 Q51 103 105 69' fill = 'none' stroke = '#16d4f7' strokeLinecap = 'round' strokeWidth = '5' />
        <circle cx = '79' cy = '48' fill = 'white' r = '5' />
        <circle cx = '91' cy = '48' fill = 'white' r = '4' />
        <path d = 'M70 63 Q79 49 88 63' fill = 'none' stroke = 'white' strokeLinecap = 'round' strokeWidth = '5' />
    </svg>
);

interface IProps extends WithTranslation {
    _serverURL?: string;
    dispatch: Dispatch;
    location?: {
        state?: {
            error?: any;
            room?: string;
            serverURL?: string;
        };
    };
}

interface IWelcomeState {
    animateTimeoutId?: ReturnType<typeof setTimeout>;
    generatedRoomname: string;
    roomPlaceholder: string;
    updateTimeoutId?: ReturnType<typeof setTimeout>;
    url: string;
}


/**
 * Welcome Component.
 */
class Welcome extends Component<IProps, IWelcomeState> {
    /**
     * Initializes a new {@code Welcome} instance.
     *
     * @inheritdoc
     */
    constructor(props: IProps) {
        super(props);

        // Initialize url value in state if passed using location state object.
        let url = '';

        // Check and parse url if exists in location state.
        if (props.location?.state) {
            const { room, serverURL } = props.location.state;

            if (room && serverURL) {
                url = `${serverURL}/${room}`;
            }
        }

        this.state = {
            animateTimeoutId: undefined,
            generatedRoomname: '',
            roomPlaceholder: '',
            updateTimeoutId: undefined,
            url
        };

        // Bind event handlers.
        this._animateRoomnameChanging = this._animateRoomnameChanging.bind(this);
        this._onURLChange = this._onURLChange.bind(this);
        this._onFormSubmit = this._onFormSubmit.bind(this);
        this._onJoin = this._onJoin.bind(this);
        this._updateRoomname = this._updateRoomname.bind(this);
    }

    /**
     * Start generating random room names.
     *
     * @returns {void}
     */
    componentDidMount() {
        this._updateRoomname();
    }

    /**
     * Stop all timers when unmounting.
     *
     * @returns {voidd}
     */
    componentWillUnmount() {
        this._clearTimeouts();
    }

    /**
     * Render function of component.
     *
     * @returns {ReactElement}
     */
    render() {
        return (
            <Page navigation = { <Navbar /> }>
                <Wrapper>
                    <Hero>
                        <Brand>
                            <BrandMark />
                            <BrandName>MEET <span>UP</span></BrandName>
                        </Brand>
                        <HeroTitle>Video Meetings<br />for <span>Everyone</span></HeroTitle>
                        <HeroDescription>Meet, collaborate, teach and work together<br />with high-quality video and audio.</HeroDescription>
                        <QuickActions>
                            <QuickAction onClick = { () => this._onJoinNewMeeting() } type = 'button'><span>▣</span>New Meeting</QuickAction>
                            <QuickAction onClick = { () => document.querySelector<HTMLInputElement>('input[type="text"]')?.focus() } type = 'button'><span>➜</span>Join Meeting</QuickAction>
                            <QuickAction disabled = { true } title = 'Scheduling coming soon' type = 'button'><span>▦</span>Schedule (soon)</QuickAction>
                            <QuickAction disabled = { true } title = 'Screen sharing is available inside a meeting' type = 'button'><span>▤</span>Share in call</QuickAction>
                        </QuickActions>
                        <MeetingPanel>{ this._renderHeader() }</MeetingPanel>
                        <FeatureStrip>
                            <FeatureCard><span>▣</span>HD Video Calls</FeatureCard>
                            <FeatureCard><span>♧</span>Many Participants</FeatureCard>
                            <FeatureCard><span>▤</span>Screen Sharing</FeatureCard>
                        </FeatureStrip>
                    </Hero>
                    { this._renderBody() }
                </Wrapper>
            </Page>
        );
    }


    /**
     * Animates the changing of the room name.
     *
     * @param {string} word - The part of room name that should be added to
     * placeholder.
     * @private
     * @returns {void}
     */
    _animateRoomnameChanging(word: string) {
        let animateTimeoutId;
        const roomPlaceholder = this.state.roomPlaceholder + word.slice(0, 1);

        if (word.length > 1) {
            animateTimeoutId
                = setTimeout(
                    () => {
                        this._animateRoomnameChanging(
                            word.substring(1, word.length));
                    },
                    70);
        }
        this.setState({
            animateTimeoutId,
            roomPlaceholder
        });
    }

    /**
     * Method that clears timeouts for animations and updates of room name.
     *
     * @private
     * @returns {void}
     */
    _clearTimeouts() {
        clearTimeout(this.state.animateTimeoutId);
        clearTimeout(this.state.updateTimeoutId);
    }


    /**
     * Prevents submission of the form and delegates the join logic.
     *
     * @param {Event} event - Event by which this function is called.
     * @returns {void}
     */
    _onFormSubmit(event: React.FormEvent) {
        event.preventDefault();
        this._onJoin();
    }


    /**
     * Redirect and join conference.
     *
     * @returns {void}
     */
    _onJoinNewMeeting() {
        const conference = createConferenceObjectFromURL(
            generateRoomWithoutSeparator(),
            this.props._serverURL || config.defaultServerURL
        );

        if (conference) {
            this.props.dispatch(addRecentListEntry(conference));
            window.jitsiElectronApp.ipc.send('open-meeting-window', conference);
        }
    }

    _onJoin() {
        const inputURL = this.state.url || this.state.generatedRoomname;
        const conference = createConferenceObjectFromURL(
            inputURL,
            this.props._serverURL || config.defaultServerURL
        );

        // Don't navigate if conference couldn't be created
        if (!conference) {
            return;
        }

        this.props.dispatch(addRecentListEntry(conference));
        window.jitsiElectronApp.ipc.send('open-meeting-window', conference);
    }


    /**
     * Keeps URL input value and URL in state in sync.
     *
     * @param {SyntheticInputEvent<HTMLInputElement>} event - Event by which
     * this function is called.
     * @returns {void}
     */
    _onURLChange(event: React.ChangeEvent<HTMLInputElement>) {
        this.setState({
            url: event.currentTarget.value
        });
    }

    /**
     * Renders the body for the welcome page.
     *
     * @returns {ReactElement}
     */
    _renderBody() {
        return (
            <Body>
                <RecentList />
            </Body>
        );
    }

    /**
     * Renders the header for the welcome page.
     *
     * @returns {ReactElement}
     */
    _renderHeader() {
        const locationState = this.props.location?.state;
        const locationError = locationState?.error;

        return (
            <Header>
                <Form onSubmit = { this._onFormSubmit }>
                    <Label>Enter a meeting room name or invitation link</Label>
                    <MainFieldText
                        autoFocus = { true }
                        isInvalid = { locationError }
                        isLabelHidden = { true }
                        onChange = { this._onURLChange }
                        placeholder = { this.state.roomPlaceholder }
                        shouldFitContainer = { true }
                        type = 'text'
                        value = { this.state.url } />
                    <MainGoButton
                        appearance = 'primary'
                        onClick = { this._onJoin }
                        type = 'button'>
                        Join Meeting
                    </MainGoButton>
                </Form>
            </Header>
        );
    }


    /**
     * Triggers the generation of a new room name and initiates an animation of
     * its changing.
     *
     * @protected
     * @returns {void}
     */
    _updateRoomname() {
        const generatedRoomname = generateRoomWithoutSeparator();
        const roomPlaceholder = '';
        const updateTimeoutId = setTimeout(this._updateRoomname, 10000);

        this._clearTimeouts();
        this.setState(
            {
                generatedRoomname,
                roomPlaceholder,
                updateTimeoutId
            },
            () => this._animateRoomnameChanging(generatedRoomname));
    }
}

/**
 * Maps (parts of) the redux state to the React props.
 *
 * @param {Object} state - The redux state.
 * @returns {Object}
 */
function _mapStateToProps(state: IState) {
    return {
        _serverURL: state.settings.serverURL
    };
}

// redux's compose() returns a loosely-typed function; cast so the connected +
// translated component is usable as JSX / a ComponentType by consumers.
export default compose(connect(_mapStateToProps), withTranslation())(Welcome) as React.ComponentType<any>;

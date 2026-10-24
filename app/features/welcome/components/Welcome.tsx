
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
    input {
        background: #111e35;
        border: 1px solid #40516d;
        border-radius: 12px;
        box-sizing: border-box;
        color: #fff;
        font-size: 16px;
        height: 54px;
        padding: 0 16px;
    }
    input:focus {
        border-color: #64b5ff;
        outline: 2px solid rgba(100, 181, 255, 0.2);
    }
`;

const MainGoButton = styled(Button)`
    background: #2563eb;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    height: 54px;
    &:hover { background: #1d4ed8; }
`;

const Hero = styled.div`
    max-width: 700px;
    padding: 64px 32px 8px;
`;

const Eyebrow = styled.div`
    color: #78b7ff;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 3px;
    text-transform: uppercase;
`;

const HeroTitle = styled.h1`
    color: #f8fafc;
    font-size: clamp(36px, 5vw, 62px);
    letter-spacing: -2px;
    line-height: 1.12;
    margin: 16px 0;
`;

const HeroDescription = styled.p`
    color: #b6c5da;
    font-size: 17px;
    line-height: 1.6;
    margin: 0 0 24px;
`;

const FeatureStrip = styled.div`
    color: #a6bad3;
    display: flex;
    flex-wrap: wrap;
    font-size: 13px;
    gap: 12px;
    margin-top: 24px;
    span {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 8px 12px;
    }
`;

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
                        <Eyebrow>MEET UP · DESKTOP MEETINGS</Eyebrow>
                        <HeroTitle>Meet better. Connect anywhere.</HeroTitle>
                        <HeroDescription>Start a secure video meeting or join your team with a room name or invitation link.</HeroDescription>
                        { this._renderHeader() }
                        <FeatureStrip>
                            <span>● HD video &amp; audio</span>
                            <span>● Screen sharing</span>
                            <span>● In-meeting chat</span>
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
                    <Label>Meeting room name or invite link </Label>
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
                        Start or join meeting
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

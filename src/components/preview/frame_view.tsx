import "./frame_view.css"

import { observer } from "mobx-react"
import React, { ChangeEvent, Component } from "react"

import { ExternalLinkIcon, RepeatIcon } from "@chakra-ui/icons"
import {
  Box,
  ButtonGroup,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Spacer,
  Switch,
} from "@chakra-ui/react"

import { ChildSetMutation } from "../../language/mutations/child_set_mutations"
import { globalMutationDispatcher } from "../../language/mutations/mutation_dispatcher"
import { NodeMutation } from "../../language/mutations/node_mutations"
import { SplootPackage } from "../../language/projects/package"

export enum FrameState {
  DEAD = 0,
  LOADING,
  SW_INSTALLING,
  LIVE,
  UNMOUNTED
}

interface DocumentNodeProps {
    pkg?: SplootPackage,
}

const subdomain = "projection"; // TODO: Make dynamic
const FRAME_VIEW_DOMAIN = process.env.FRAME_VIEW_DOMAIN;
const FRAME_VIEW_SCHEME = process.env.FRAME_VIEW_SCHEME;

function getHiddenFrameSrc() {
  let rand = Math.floor((Math.random() * 1000000) + 1);
  return getFrameDomain() + '/splootframeclient.html' + '?a=' + rand;
}

function getFrameDomain() {
  if (FRAME_VIEW_DOMAIN.startsWith('localhost')) {
    return FRAME_VIEW_SCHEME + '://' + FRAME_VIEW_DOMAIN;
  }
  return FRAME_VIEW_SCHEME + '://' + subdomain + '.' + FRAME_VIEW_DOMAIN;
}


class DocumentNodeComponent extends Component<DocumentNodeProps> {
  private previewFrameRef: React.RefObject<HTMLIFrameElement>;
  private hiddenFrameRef: React.RefObject<HTMLIFrameElement>;
  private hiddenFrameState: FrameState;
  private lastHeartbeatTimestamp: Date;
  private lastSentNodeTree: Date;
  private needsNewNodeTree: boolean;
  private autorefresh: boolean;

  constructor(props: DocumentNodeProps) {
    super(props);
    this.previewFrameRef = React.createRef();
    this.hiddenFrameRef = React.createRef();
    this.hiddenFrameState = FrameState.LOADING;
    this.lastHeartbeatTimestamp = new Date();
    this.lastSentNodeTree = new Date(new Date().getMilliseconds() - 1000);
    this.needsNewNodeTree = false;
    this.autorefresh = true;
  }

  render() {
    this.needsNewNodeTree = true;
    return (
      <div id="frame-container">
        <FramePanel
            reload={this.reloadSiteInFrame}
            frameUrl={getFrameDomain() + '/index.html'}
            setAutorefresh={this.setAutorefresh}/>
        <iframe ref={this.previewFrameRef}
          id="view-frame"
          src={getFrameDomain() + '/index.html'}
        />
        <iframe ref={this.hiddenFrameRef}
          id="hidden-frame"
          src={getHiddenFrameSrc()}
        />
      </div>
    );
  }

  setAutorefresh = (autorefresh: boolean) => {
    this.autorefresh = autorefresh;
  }

  sendNodeTreeToHiddenFrame() {
    let now = new Date();
    let millis = (now.getTime() - this.lastSentNodeTree.getTime());
    let pkg = this.props.pkg;

    // Rate limit: Only send if it's been some time since we last sent.
    if (millis > 200) {
      this.lastSentNodeTree = now;
      this.needsNewNodeTree = false;
      pkg.fileOrder.forEach(filename => {
        pkg.getLoadedFile(filename).then((file) => {
          let payload = {type: 'nodetree', data: {filename: file.name, tree: file.rootNode.serialize()}};
          this.postMessageToHiddenFrame(payload);
          return;
        })
      })
    }
  }

  postMessageToHiddenFrame(payload: object) {
    try {
      this.hiddenFrameRef.current.contentWindow.postMessage(payload, getFrameDomain());
    }
    catch (error) {
      console.warn(error);
    }
  }

  sendHeartbeatRequest() {
    let payload = {type: 'heartbeat'};
    this.postMessageToHiddenFrame(payload);
  }

  checkHeartbeatFromFrame = () => {
    if (this.hiddenFrameState === FrameState.UNMOUNTED) {
      return;
    }
    let now = new Date();
    let millis = (now.getTime() - this.lastHeartbeatTimestamp.getTime());
    if (millis > 30000) {
      this.hiddenFrameState = FrameState.DEAD;
    }
    switch (this.hiddenFrameState) {
      case FrameState.LOADING:
      case FrameState.SW_INSTALLING:
        // Waiting for the initial frame load to tell us it's ready.
        // If this doesn't happen, we'll mark the frame dead and reload.
        break;
      case FrameState.LIVE:
        if (this.needsNewNodeTree) {
          this.sendNodeTreeToHiddenFrame();
        } else {
          this.sendHeartbeatRequest();
        }
        break;
      case FrameState.DEAD:
        console.warn('hidden frame is dead, reloading');
        this.previewFrameRef.current.src = getHiddenFrameSrc();
        this.hiddenFrameState = FrameState.LOADING;
        this.lastHeartbeatTimestamp = new Date();
        break;
    }

    setTimeout(() => {
      this.checkHeartbeatFromFrame();
    }, 2000); // 2s
  }

  handleNodeMutation = (mutation: NodeMutation) => {
    // There's a node tree version we've not loaded yet.
    this.needsNewNodeTree = true;
    this.sendNodeTreeToHiddenFrame();
  }

  handleChildSetMutation = (mutation: ChildSetMutation) => {
    // There's a node tree version we've not loaded yet.
    this.needsNewNodeTree = true;
    this.sendNodeTreeToHiddenFrame();
  }

  processMessage = (event: MessageEvent) => {
    if (event.origin === getFrameDomain()) {
      this.handleMessageFromHiddenFrame(event);
    }
  }
  reloadSiteInFrame = () => {
    this.previewFrameRef.current.src = getFrameDomain() + '/index.html';
  }

  handleMessageFromHiddenFrame(event: MessageEvent) {
    let type = event.data.type as string;
    if (event.origin !== getFrameDomain()) {
      return;
    }
    if (!event.data.type) {
      return;
    }
    if (type.startsWith('webpack')) {
      // Ignore webpack devserver events for local dev
      return;
    }
    switch(type) {
      case 'heartbeat':
        let newState = event.data.data['state']
        if (newState === FrameState.LIVE && this.hiddenFrameState !== FrameState.LIVE) {
          // Frame recently became live, send nodetree.
          if (this.needsNewNodeTree) {
            this.sendNodeTreeToHiddenFrame();
          }
        }
        this.hiddenFrameState = newState;
        this.lastHeartbeatTimestamp = new Date();
        break;
      case 'loaded':
        this.lastHeartbeatTimestamp = new Date();
        if (this.autorefresh) {
          this.reloadSiteInFrame();
        }
        break;
      default:
        console.warn('Unknown event from frame: ', event);
    }
  }

  componentDidMount() {
    this.hiddenFrameState = FrameState.LOADING;
    globalMutationDispatcher.registerChildSetObserver(this);
    globalMutationDispatcher.registerNodeObserver(this);
    window.addEventListener("message", this.processMessage, false);
    // trigger background process to wait for a response
    setTimeout(() => {
      this.checkHeartbeatFromFrame();
    }, 0);
  }

  componentWillUnmount() {
    this.hiddenFrameState = FrameState.UNMOUNTED;
    globalMutationDispatcher.deregisterChildSetObserver(this);
    globalMutationDispatcher.deregisterNodeObserver(this);
    // mutationDispatcher.deregisterHandler(this.handleMutation);
    window.removeEventListener("message", this.processMessage, false);
  }
}

type ViewPageProps = {
  pkg: SplootPackage,
}

type ViewPageState = {
    hasError: boolean;
    error: any;
    errorInfo: any;
}

interface FramePanelProps {
  reload: () => void;
  setAutorefresh: (autorefresh: boolean) => void;
  frameUrl: string;
}

interface FramePanelState {
  autorefresh: boolean;
}

export class FramePanel extends Component<FramePanelProps, FramePanelState> {

  constructor(props: FramePanelProps) {
    super(props);
    this.state = {
      autorefresh: true,
    }
  }

  onAutorefreshChanged = (event: ChangeEvent<HTMLInputElement>) => {
    this.props.setAutorefresh(event.target.checked);
    this.setState({autorefresh: event.target.checked})
  }

  render() {
    return (
      <Box justifyContent="center" textAlign="center" p={3} borderBottom={"1px"} borderBottomColor="rgb(209, 209, 209)">
        <HStack>
        <FormControl display="flex" alignItems="center" width="48" >
            <Switch id="autorefresh" isChecked={this.state.autorefresh} onChange={this.onAutorefreshChanged}/>
            <FormLabel htmlFor="autorefresh" mb="0" ml="3">
              Auto-refresh
            </FormLabel>
          </FormControl>
          <Spacer/>
          <ButtonGroup size="md" isAttached variant="outline">
            <IconButton onClick={this.props.reload} aria-label="refresh" icon={<RepeatIcon/>}>reload</IconButton>
            <IconButton onClick={() => { window.open(this.props.frameUrl, "_blank")}} aria-label="open in new tab" icon={<ExternalLinkIcon/>}/>
          </ButtonGroup>
        </HStack>
      </Box>
    );
  }
}

@observer
export class ViewPage extends Component<ViewPageProps, ViewPageState> {
    constructor(props : ViewPageProps) {
      super(props);
      this.state = {
          hasError: false,
          error: '',
          errorInfo: '',
      };
    }

    componentDidCatch(error, info) {
      this.setState({
        hasError: true,
        error: error,
        errorInfo: info,
      } );
    }

    resetErrors = (event) => {
        this.setState({hasError: false});
    }

    render() {
        let { pkg } = this.props;
        if (this.state.hasError) {
            return (
                <div>
                    <h2>Error!</h2>
                    <p>{this.state.error.toString()}</p>
                    <button onClick={this.resetErrors}>Try again</button>
                </div>
            );
        }
        return (
          <DocumentNodeComponent pkg={pkg}/>
        );
    }
}
  
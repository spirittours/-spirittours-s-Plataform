"""
Jitsi Meet Service - Free Alternative to Zoom/Teams
Open-source video conferencing with no time limits
Cost: $0 (completely free, no limits)
Features:
- Unlimited meeting duration
- Up to 100 participants (500+ with self-hosting)
- Screen sharing and recording
- Live streaming to YouTube
- End-to-end encryption (beta)
- No account required for participants
- Virtual backgrounds
- Chat and reactions
- Mobile apps available
- Breakout rooms
"""

import asyncio
import httpx
import jwt
import uuid
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import json
import logging
import secrets
from urllib.parse import urlencode, quote

logger = logging.getLogger(__name__)

class MeetingStatus(Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    ENDED = "ended"
    CANCELLED = "cancelled"

class ParticipantRole(Enum):
    MODERATOR = "moderator"
    PARTICIPANT = "participant"
    VIEWER = "viewer"

class RecordingMode(Enum):
    OFF = "off"
    LOCAL = "local"
    CLOUD = "cloud"
    STREAM = "stream"

@dataclass
class Meeting:
    """Video meeting"""
    meeting_id: str
    room_name: str
    subject: str
    start_time: Optional[datetime] = None
    duration: Optional[int] = None  # minutes
    password: Optional[str] = None
    moderator_password: Optional[str] = None
    status: MeetingStatus = MeetingStatus.SCHEDULED
    participants: List[str] = None
    max_participants: int = 100
    recording_mode: RecordingMode = RecordingMode.OFF
    live_streaming: bool = False
    lobby_enabled: bool = False
    
@dataclass
class Participant:
    """Meeting participant"""
    participant_id: str
    display_name: str
    email: Optional[str] = None
    role: ParticipantRole = ParticipantRole.PARTICIPANT
    join_time: Optional[datetime] = None
    leave_time: Optional[datetime] = None
    duration: Optional[int] = None  # seconds
    audio_muted: bool = False
    video_muted: bool = False
    screen_sharing: bool = False
    hand_raised: bool = False
    
@dataclass
class Recording:
    """Meeting recording"""
    recording_id: str
    meeting_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[int] = None  # seconds
    file_size: Optional[int] = None  # bytes
    download_url: Optional[str] = None
    streaming_url: Optional[str] = None
    
class JitsiMeetService:
    """
    Complete Jitsi Meet integration
    Free, unlimited video conferencing
    """
    
    def __init__(
        self,
        server_url: str = None,
        app_id: Optional[str] = None,
        app_secret: Optional[str] = None
    ):
        # Configuration
        self.server_url = server_url or "https://meet.jit.si"
        self.app_id = app_id or "spirittours"
        self.app_secret = app_secret or secrets.token_urlsafe(32)
        
        # Alternative public servers for load balancing
        self.public_servers = [
            "https://meet.jit.si",
            "https://8x8.vc",
            "https://meet.guifi.net",
            "https://meet.ffmuc.net"
        ]
        
        # Meeting management
        self.meetings: Dict[str, Meeting] = {}
        self.participants: Dict[str, List[Participant]] = {}
        self.recordings: Dict[str, Recording] = {}
        
        # Configuration options
        self.default_config = {
            "disableDeepLinking": True,
            "disableInviteFunctions": False,
            "doNotStoreRoom": False,
            "enableWelcomePage": False,
            "prejoinPageEnabled": True,
            "requireDisplayName": True,
            "resolution": 720,
            "constraints": {
                "video": {
                    "height": {"ideal": 720, "max": 1080, "min": 240}
                }
            },
            "toolbarButtons": [
                "microphone", "camera", "closedcaptions", "desktop",
                "fullscreen", "fodeviceselection", "hangup", "profile",
                "chat", "recording", "livestreaming", "etherpad",
                "sharedvideo", "settings", "raisehand", "videoquality",
                "filmstrip", "participants-pane", "feedback", "stats",
                "shortcuts", "tileview", "videobackgroundblur",
                "download", "help", "mute-everyone"
            ]
        }
        
        # Interface customization
        self.interface_config = {
            "SHOW_JITSI_WATERMARK": False,
            "SHOW_WATERMARK_FOR_GUESTS": False,
            "DEFAULT_BACKGROUND": "#1a1a2e",
            "DISABLE_VIDEO_BACKGROUND": False,
            "DEFAULT_LOCAL_DISPLAY_NAME": "Me",
            "DEFAULT_REMOTE_DISPLAY_NAME": "Guest",
            "TOOLBAR_ALWAYS_VISIBLE": False,
            "FILM_STRIP_MAX_HEIGHT": 120,
            "ENABLE_FEEDBACK_ANIMATION": False,
            "DISABLE_PRESENCE_STATUS": False,
            "DISABLE_JOIN_LEAVE_NOTIFICATIONS": False
        }
        
    def create_meeting(
        self,
        subject: str,
        start_time: Optional[datetime] = None,
        duration: Optional[int] = None,
        password: Optional[str] = None,
        max_participants: int = 100,
        enable_recording: bool = False,
        enable_streaming: bool = False,
        enable_lobby: bool = False,
        custom_room_name: Optional[str] = None
    ) -> Meeting:
        """
        Create new video meeting
        No account required, instant meeting creation
        """
        # Generate unique room name
        if custom_room_name:
            room_name = self._sanitize_room_name(custom_room_name)
        else:
            room_name = f"SpiritTours-{uuid.uuid4().hex[:8]}"
            
        meeting_id = str(uuid.uuid4())
        
        # Generate moderator password if not provided
        moderator_password = secrets.token_urlsafe(16)
        
        meeting = Meeting(
            meeting_id=meeting_id,
            room_name=room_name,
            subject=subject,
            start_time=start_time or datetime.now(),
            duration=duration,
            password=password,
            moderator_password=moderator_password,
            status=MeetingStatus.SCHEDULED,
            participants=[],
            max_participants=max_participants,
            recording_mode=RecordingMode.LOCAL if enable_recording else RecordingMode.OFF,
            live_streaming=enable_streaming,
            lobby_enabled=enable_lobby
        )
        
        self.meetings[meeting_id] = meeting
        self.participants[meeting_id] = []
        
        return meeting
        
    def get_meeting_url(
        self,
        meeting: Meeting,
        participant_name: Optional[str] = None,
        is_moderator: bool = False,
        config_overrides: Optional[Dict] = None
    ) -> str:
        """
        Generate meeting join URL
        """
        base_url = f"{self.server_url}/{meeting.room_name}"
        
        # Build configuration parameters
        config = self.default_config.copy()
        if config_overrides:
            config.update(config_overrides)
            
        # Add JWT token for secure meetings
        jwt_token = None
        if is_moderator or meeting.password:
            jwt_token = self._generate_jwt_token(
                room_name=meeting.room_name,
                is_moderator=is_moderator,
                participant_name=participant_name
            )
            
        # Build query parameters
        params = []
        
        if participant_name:
            params.append(f"displayName={quote(participant_name)}")
            
        if jwt_token:
            params.append(f"jwt={jwt_token}")
            
        # Add configuration parameters
        params.append(f"config.subject={quote(meeting.subject)}")
        
        if meeting.password and not is_moderator:
            params.append(f"password={meeting.password}")
            
        if meeting.lobby_enabled:
            params.append("config.enableLobby=true")
            
        if meeting.recording_mode != RecordingMode.OFF:
            params.append("config.startWithRecordingOn=true")
            
        if meeting.live_streaming:
            params.append("config.livestreaming.enabled=true")
            
        # Add interface configuration
        for key, value in self.interface_config.items():
            if isinstance(value, bool):
                params.append(f"interfaceConfig.{key}={str(value).lower()}")
            else:
                params.append(f"interfaceConfig.{key}={value}")
                
        # Build final URL
        if params:
            return f"{base_url}#{'&'.join(params)}"
        else:
            return base_url
            
    def get_embedded_meeting(
        self,
        meeting: Meeting,
        width: str = "100%",
        height: str = "600px",
        config_overrides: Optional[Dict] = None
    ) -> str:
        """
        Generate embedded meeting iframe
        """
        meeting_url = self.get_meeting_url(meeting, config_overrides=config_overrides)
        
        return f"""
        <iframe 
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            src="{meeting_url}"
            style="width: {width}; height: {height}; border: 0;">
        </iframe>
        """
        
    def get_meeting_widget(
        self,
        meeting: Meeting,
        container_id: str = "jitsi-container",
        width: str = "100%",
        height: str = "600px"
    ) -> str:
        """
        Generate Jitsi Meet API widget
        Full control via JavaScript API
        """
        config = json.dumps(self.default_config)
        interface_config = json.dumps(self.interface_config)
        
        widget_html = f"""
        <div id="{container_id}" style="width: {width}; height: {height};"></div>
        
        <script src="{self.server_url}/external_api.js"></script>
        <script>
            const domain = '{self.server_url.replace("https://", "").replace("http://", "")}';
            const options = {{
                roomName: '{meeting.room_name}',
                width: '{width}',
                height: '{height}',
                parentNode: document.querySelector('#{container_id}'),
                configOverwrite: {config},
                interfaceConfigOverwrite: {interface_config},
                userInfo: {{
                    email: '',
                    displayName: ''
                }}
            }};
            
            const api = new JitsiMeetExternalAPI(domain, options);
            
            // Event listeners
            api.addEventListener('videoConferenceJoined', (event) => {{
                console.log('Joined meeting:', event);
                // Track participant join
                fetch('/api/jitsi/participant-joined', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{
                        meeting_id: '{meeting.meeting_id}',
                        participant_id: event.id,
                        display_name: event.displayName
                    }})
                }});
            }});
            
            api.addEventListener('videoConferenceLeft', (event) => {{
                console.log('Left meeting:', event);
                // Track participant leave
                fetch('/api/jitsi/participant-left', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{
                        meeting_id: '{meeting.meeting_id}',
                        participant_id: event.id
                    }})
                }});
            }});
            
            api.addEventListener('recordingStatusChanged', (event) => {{
                console.log('Recording status:', event);
            }});
            
            // API commands
            window.jitsiAPI = api;
            
            // Utility functions
            window.muteMicrophone = () => api.executeCommand('toggleAudio');
            window.muteCamera = () => api.executeCommand('toggleVideo');
            window.shareScreen = () => api.executeCommand('toggleShareScreen');
            window.startRecording = () => api.executeCommand('startRecording', {{mode: 'local'}});
            window.stopRecording = () => api.executeCommand('stopRecording');
            window.raiseHand = () => api.executeCommand('toggleRaiseHand');
            window.openChat = () => api.executeCommand('toggleChat');
            window.setSubject = (subject) => api.executeCommand('subject', subject);
        </script>
        """
        
        return widget_html
        
    async def start_recording(
        self,
        meeting_id: str,
        mode: RecordingMode = RecordingMode.LOCAL
    ) -> bool:
        """
        Start meeting recording
        """
        if meeting_id in self.meetings:
            meeting = self.meetings[meeting_id]
            meeting.recording_mode = mode
            
            # Create recording entry
            recording = Recording(
                recording_id=str(uuid.uuid4()),
                meeting_id=meeting_id,
                start_time=datetime.now()
            )
            
            self.recordings[recording.recording_id] = recording
            
            return True
            
        return False
        
    async def stop_recording(
        self,
        meeting_id: str
    ) -> Optional[Recording]:
        """
        Stop meeting recording
        """
        # Find active recording
        for recording in self.recordings.values():
            if recording.meeting_id == meeting_id and recording.end_time is None:
                recording.end_time = datetime.now()
                recording.duration = int((recording.end_time - recording.start_time).total_seconds())
                
                # Generate download URL (would be actual file in production)
                recording.download_url = f"{self.server_url}/recordings/{recording.recording_id}"
                
                return recording
                
        return None
        
    async def start_live_stream(
        self,
        meeting_id: str,
        streaming_url: str,
        streaming_key: str
    ) -> bool:
        """
        Start live streaming to YouTube/Twitch
        """
        if meeting_id in self.meetings:
            meeting = self.meetings[meeting_id]
            meeting.live_streaming = True
            
            # In production, this would configure actual streaming
            logger.info(f"Starting stream for {meeting_id} to {streaming_url}")
            
            return True
            
        return False
        
    def add_participant(
        self,
        meeting_id: str,
        display_name: str,
        email: Optional[str] = None,
        role: ParticipantRole = ParticipantRole.PARTICIPANT
    ) -> Participant:
        """
        Add participant to meeting
        """
        participant = Participant(
            participant_id=str(uuid.uuid4()),
            display_name=display_name,
            email=email,
            role=role,
            join_time=datetime.now()
        )
        
        if meeting_id not in self.participants:
            self.participants[meeting_id] = []
            
        self.participants[meeting_id].append(participant)
        
        # Update meeting participant list
        if meeting_id in self.meetings:
            self.meetings[meeting_id].participants.append(participant.participant_id)
            
        return participant
        
    def remove_participant(
        self,
        meeting_id: str,
        participant_id: str
    ) -> bool:
        """
        Remove participant from meeting
        """
        if meeting_id in self.participants:
            for participant in self.participants[meeting_id]:
                if participant.participant_id == participant_id:
                    participant.leave_time = datetime.now()
                    participant.duration = int(
                        (participant.leave_time - participant.join_time).total_seconds()
                    )
                    
                    # Update meeting participant list
                    if meeting_id in self.meetings:
                        meeting = self.meetings[meeting_id]
                        if participant_id in meeting.participants:
                            meeting.participants.remove(participant_id)
                            
                    return True
                    
        return False
        
    async def create_breakout_room(
        self,
        parent_meeting_id: str,
        room_name: str,
        participants: List[str]
    ) -> Meeting:
        """
        Create breakout room for smaller group discussions
        """
        parent_meeting = self.meetings.get(parent_meeting_id)
        
        if parent_meeting:
            breakout_room = self.create_meeting(
                subject=f"Breakout: {room_name}",
                max_participants=len(participants)
            )
            
            # Move participants to breakout room
            for participant_id in participants:
                # In production, would send API command to move participant
                pass
                
            return breakout_room
            
        return None
        
    def enable_virtual_background(
        self,
        background_type: str = "blur",
        background_image: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enable virtual background
        """
        config = {
            "virtualBackground": {
                "backgroundType": background_type,
                "enabled": True
            }
        }
        
        if background_image:
            config["virtualBackground"]["virtualSource"] = background_image
            
        return config
        
    def create_poll(
        self,
        question: str,
        options: List[str],
        allow_multiple: bool = False
    ) -> Dict[str, Any]:
        """
        Create meeting poll
        """
        poll_id = str(uuid.uuid4())
        
        return {
            "poll_id": poll_id,
            "question": question,
            "options": options,
            "allow_multiple": allow_multiple,
            "created_at": datetime.now().isoformat()
        }
        
    def generate_meeting_stats(
        self,
        meeting_id: str
    ) -> Dict[str, Any]:
        """
        Generate meeting statistics
        """
        if meeting_id not in self.meetings:
            return {}
            
        meeting = self.meetings[meeting_id]
        participants = self.participants.get(meeting_id, [])
        
        total_duration = sum(p.duration or 0 for p in participants)
        avg_duration = total_duration / len(participants) if participants else 0
        
        return {
            "meeting_id": meeting_id,
            "subject": meeting.subject,
            "start_time": meeting.start_time.isoformat() if meeting.start_time else None,
            "total_participants": len(participants),
            "unique_participants": len(set(p.participant_id for p in participants)),
            "average_duration": avg_duration,
            "total_duration": total_duration,
            "peak_participants": max(len(meeting.participants), len(participants)),
            "recording_available": any(
                r.meeting_id == meeting_id for r in self.recordings.values()
            )
        }
        
    def schedule_recurring_meeting(
        self,
        subject: str,
        recurrence: str = "weekly",
        day_of_week: Optional[int] = None,
        time: Optional[str] = None,
        duration: int = 60,
        occurrences: int = 10
    ) -> List[Meeting]:
        """
        Schedule recurring meetings
        """
        meetings = []
        base_date = datetime.now()
        
        for i in range(occurrences):
            if recurrence == "daily":
                meeting_date = base_date + timedelta(days=i)
            elif recurrence == "weekly":
                meeting_date = base_date + timedelta(weeks=i)
            elif recurrence == "monthly":
                meeting_date = base_date + timedelta(days=30*i)
            else:
                meeting_date = base_date
                
            meeting = self.create_meeting(
                subject=f"{subject} - {meeting_date.strftime('%Y-%m-%d')}",
                start_time=meeting_date,
                duration=duration
            )
            
            meetings.append(meeting)
            
        return meetings
        
    def get_meeting_invite(
        self,
        meeting: Meeting,
        organizer_name: str = "Spirit Tours",
        include_dial_in: bool = False
    ) -> str:
        """
        Generate meeting invitation text
        """
        meeting_url = self.get_meeting_url(meeting)
        
        invite = f"""
You're invited to join a video meeting!

Topic: {meeting.subject}
Time: {meeting.start_time.strftime('%B %d, %Y at %I:%M %p') if meeting.start_time else 'Now'}
Duration: {meeting.duration} minutes

Join Meeting:
{meeting_url}

Meeting ID: {meeting.room_name}
"""
        
        if meeting.password:
            invite += f"Password: {meeting.password}\n"
            
        if include_dial_in:
            invite += """
Join by Phone:
US: +1 512 647 1431
PIN: 2146850925#
"""
        
        invite += f"""
Organized by: {organizer_name}

No account needed - just click the link and join!
Works on any device with a web browser.
        """
        
        return invite
        
    def _sanitize_room_name(self, room_name: str) -> str:
        """
        Sanitize room name for URL
        """
        import re
        # Remove special characters, keep only alphanumeric and dashes
        sanitized = re.sub(r'[^a-zA-Z0-9-]', '', room_name)
        # Ensure it starts with a letter
        if sanitized and not sanitized[0].isalpha():
            sanitized = 'Room' + sanitized
        return sanitized or f"Room{uuid.uuid4().hex[:8]}"
        
    def _generate_jwt_token(
        self,
        room_name: str,
        is_moderator: bool = False,
        participant_name: Optional[str] = None
    ) -> str:
        """
        Generate JWT token for secure meetings
        """
        payload = {
            "aud": self.app_id,
            "iss": self.app_id,
            "sub": self.server_url,
            "room": room_name,
            "exp": int((datetime.now() + timedelta(hours=24)).timestamp()),
            "moderator": is_moderator
        }
        
        if participant_name:
            payload["user"] = {
                "name": participant_name
            }
            
        token = jwt.encode(
            payload,
            self.app_secret,
            algorithm="HS256"
        )
        
        return token
        
    async def test_server_availability(
        self,
        server_url: Optional[str] = None
    ) -> bool:
        """
        Test if Jitsi server is available
        """
        test_url = server_url or self.server_url
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{test_url}/config.js",
                    timeout=5.0
                )
                return response.status_code == 200
                
        except:
            return False
            
    def select_best_server(self) -> str:
        """
        Select best available public server
        """
        import random
        # In production, would test latency and load
        return random.choice(self.public_servers)
        

# Export service
jitsi_service = JitsiMeetService()
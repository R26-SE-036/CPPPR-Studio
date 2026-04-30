import json
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List

class MockSessionGenerator:
    """Generates realistic mock pair programming sessions for training data."""
    
    def __init__(self):
        self.session_id_counter = 1000
    
    def generate_session(self, duration_minutes: int = 20, target_state: str = None) -> Dict[str, Any]:
        """Generate a single mock session with realistic collaboration patterns."""
        session_id = f"S{self.session_id_counter:04d}"
        self.session_id_counter += 1
        
        # Generate base timestamp
        start_time = datetime.now()
        events = []
        
        # Define collaboration patterns based on target state
        patterns = {
            "PRODUCTIVE": self._productive_pattern,
            "DRIVER_DOMINANCE": self._driver_dominance_pattern,
            "PASSIVE_NAVIGATOR": self._passive_navigator_pattern,
            "LOGIC_STRUGGLE": self._logic_struggle_pattern,
            "DISENGAGED": self._disengaged_pattern
        }
        
        # Use pattern for target state or random if no target
        pattern_func = patterns.get(target_state, self._productive_pattern)
        
        # Generate events for each minute
        for minute in range(duration_minutes):
            current_time = start_time + timedelta(minutes=minute)
            
            # Generate events for this minute
            minute_events = pattern_func(session_id, minute, duration_minutes)
            events.extend(minute_events)
        
        return {
            "sessionId": session_id,
            "startTime": start_time.isoformat(),
            "endTime": (start_time + timedelta(minutes=duration_minutes)).isoformat(),
            "durationMinutes": duration_minutes,
            "events": events,
            "targetState": target_state
        }
    
    def _productive_pattern(self, session_id: str, minute: int, duration: int) -> List[Dict[str, Any]]:
        """Generate events for productive collaboration."""
        events = []
        
        # Both users active with balanced participation
        user1_active = random.random() > 0.3
        user2_active = random.random() > 0.3
        
        if user1_active and user2_active:
            # Both editing
            if random.random() > 0.7:
                events.append({
                    "userId": "U001",
                    "role": "DRIVER",
                    "eventType": "CODE_EDIT",
                    "timestamp": f"{session_id}-{minute:02d}",
                    "metadata": {"linesAdded": random.randint(2, 5)}
                })
                events.append({
                    "userId": "U002", 
                    "role": "NAVIGATOR",
                    "eventType": "CODE_EDIT",
                    "timestamp": f"{session_id}-{minute:02d}",
                    "metadata": {"linesAdded": random.randint(1, 3)}
                })
            else:
                # One editing, one discussing
                events.append({
                    "userId": "U001" if user1_active else "U002",
                    "role": "DRIVER" if user1_active else "NAVIGATOR",
                    "eventType": "CODE_EDIT",
                    "timestamp": f"{session_id}-{minute:02d}",
                    "metadata": {"linesAdded": random.randint(3, 8)}
                })
                events.append({
                    "userId": "U002" if user1_active else "U001",
                    "role": "NAVIGATOR" if user1_active else "DRIVER",
                    "eventType": "DISCUSSION_NOTE",
                    "timestamp": f"{session_id}-{minute:02d}",
                    "metadata": {"content": "Good approach!"}
                })
        
        # Occasional role switches
        if minute > 0 and minute % 8 == 0:
            events.append({
                "userId": "U001" if user1_active else "U002",
                "eventType": "ROLE_SWITCH",
                "timestamp": f"{session_id}-{minute:02d}"
            })
        
        # Occasional code runs
        if minute > 5 and random.random() > 0.6:
            success = random.random() > 0.3
            events.append({
                "userId": "U001",
                "eventType": "CODE_RUN",
                "timestamp": f"{session_id}-{minute:02d}",
                "metadata": {"success": success, "output": "Program executed successfully" if success else "Error: compilation failed"}
            })
        
        return events
    
    def _driver_dominance_pattern(self, session_id: str, minute: int, duration: int) -> List[Dict[str, Any]]:
        """Generate events for driver dominance pattern."""
        events = []
        
        # User 1 does most editing
        events.append({
            "userId": "U001",
            "role": "DRIVER",
            "eventType": "CODE_EDIT",
            "timestamp": f"{session_id}-{minute:02d}",
            "metadata": {"linesAdded": random.randint(5, 12)}
        })
        
        # User 2 mostly passive
        if random.random() > 0.7:
            events.append({
                "userId": "U002",
                "role": "NAVIGATOR",
                "eventType": "DISCUSSION_NOTE",
                "timestamp": f"{session_id}-{minute:02d}",
                "metadata": {"content": "Looks good to me"}
            })
        
        # No role switches
        # Long periods without switching
        
        return events
    
    def _passive_navigator_pattern(self, session_id: str, minute: int, duration: int) -> List[Dict[str, Any]]:
        """Generate events for passive navigator pattern."""
        events = []
        
        # User 1 actively coding
        events.append({
            "userId": "U001",
            "role": "DRIVER",
            "eventType": "CODE_EDIT",
            "timestamp": f"{session_id}-{minute:02d}",
            "metadata": {"linesAdded": random.randint(8, 15)}
        })
        
        # User 2 very passive
        # Rare discussion notes, mostly idle
        
        # Occasional failed runs
        if minute > 10 and random.random() > 0.8:
            events.append({
                "userId": "U001",
                "eventType": "CODE_RUN",
                "timestamp": f"{session_id}-{minute:02d}",
                "metadata": {"success": False, "error": "ArrayIndexOutOfBounds"}
            })
        
        return events
    
    def _logic_struggle_pattern(self, session_id: str, minute: int, duration: int) -> List[Dict[str, Any]]:
        """Generate events for logic struggle pattern."""
        events = []
        
        # Both users editing but with backtracking
        for user_id in ["U001", "U002"]:
            events.append({
                "userId": user_id,
                "role": "DRIVER",
                "eventType": "CODE_EDIT",
                "timestamp": f"{session_id}-{minute:02d}",
                "metadata": {
                    "linesAdded": random.randint(1, 3),
                    "linesDeleted": random.randint(1, 2)  # Backtracking
                }
            })
        
        # Multiple failed runs
        if minute > 5 and random.random() > 0.5:
            for user_id in ["U001", "U002"]:
                events.append({
                    "userId": user_id,
                    "eventType": "CODE_RUN",
                    "timestamp": f"{session_id}-{minute:02d}",
                    "metadata": {"success": False, "error": "NullPointerException"}
                })
        
        # Some discussion but mostly frustration
        if random.random() > 0.6:
            events.append({
                "userId": "U001",
                "eventType": "DISCUSSION_NOTE",
                "timestamp": f"{session_id}-{minute:02d}",
                "metadata": {"content": "This isn't working..."}
            })
        
        return events
    
    def _disengaged_pattern(self, session_id: str, minute: int, duration: int) -> List[Dict[str, Any]]:
        """Generate events for disengaged pattern."""
        events = []
        
        # Very low activity
        if random.random() > 0.8:
            # Occasional minimal activity
            events.append({
                "userId": "U001",
                "role": "DRIVER",
                "eventType": "CODE_EDIT",
                "timestamp": f"{session_id}-{minute:02d}",
                "metadata": {"linesAdded": 1}
            })
        
        # Mostly idle time
        # No significant events for most minutes
        
        return events
    
    def generate_training_dataset(self, num_sessions: int = 50) -> List[Dict[str, Any]]:
        """Generate a complete training dataset with balanced states."""
        sessions = []
        
        # Define state distribution
        state_distribution = {
            "PRODUCTIVE": 0.4,
            "DRIVER_DOMINANCE": 0.25,
            "PASSIVE_NAVIGATOR": 0.2,
            "LOGIC_STRUGGLE": 0.1,
            "DISENGAGED": 0.05
        }
        
        for i in range(num_sessions):
            # Select state based on distribution
            rand = random.random()
            cumulative_prob = 0
            selected_state = None
            
            for state, prob in state_distribution.items():
                cumulative_prob += prob
                if rand <= cumulative_prob:
                    selected_state = state
                    break
            
            # Generate session
            duration = random.randint(15, 25)
            session = self.generate_session(duration, selected_state)
            sessions.append(session)
        
        return sessions
    
    def save_sessions_to_json(self, sessions: List[Dict[str, Any]], filename: str):
        """Save sessions to JSON file."""
        with open(filename, 'w') as f:
            json.dump(sessions, f, indent=2)
        print(f"✅ Saved {len(sessions)} sessions to {filename}")

if __name__ == "__main__":
    generator = MockSessionGenerator()
    
    # Generate training dataset
    sessions = generator.generate_training_dataset(200)
    generator.save_sessions_to_json(sessions, '../data/raw_sessions/mock_training_sessions.json')
    
    print("🎯 Mock training dataset generated successfully!")
    print(f"📊 Session distribution:")
    state_counts = {}
    for session in sessions:
        state = session.get('targetState', 'PRODUCTIVE')
        state_counts[state] = state_counts.get(state, 0) + 1
    
    for state, count in state_counts.items():
        print(f"  {state}: {count} sessions ({count/len(sessions)*100:.1f}%)")

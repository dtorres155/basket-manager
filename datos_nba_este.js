/* DATOS NBA · Conferencia Este (temporada 2026-27, estimaciones sobre la base 2025-26).
   Fila: [nombre,pos,edad,ovr,pot,perfil,salario M$,fin contrato,nac?]. Plantillas completadas con relleno ficticio. */
(function () {
  const O = { usd: true, conf: 'E', plantilla: 14 };
  GM.club(['atlanta-hawks', 'Atlanta Hawks', 'ATL', 'Atlanta', 'US', ['#e03a3e', '#c1d32f'], 62, 380, 'State Farm Arena', 16600], [
    ['Jalen Johnson', 'SF', 24, 86, 88, 'E', 30, 2030], ['CJ McCollum', 'SG', 35, 76, 76, 'T', 30, 2027],
    ['Dyson Daniels', 'SG', 23, 80, 83, 'D', 25, 2030, 'AU'], ['Onyeka Okongwu', 'C', 25, 77, 78, 'R', 15, 2030],
    ['Jonathan Kuminga', 'PF', 23, 76, 80, 'T', 24, 2028], ['Nickeil Alexander-Walker', 'SG', 28, 75, 75, 'T', 18, 2029, 'CA'],
    ['Zaccharie Risacher', 'SF', 21, 72, 80, 'T', 12, 2028, 'FR'], ['Vit Krejci', 'SG', 26, 66, 66, 'T', 10, 2028, 'CZ'],
    ['Asa Newell', 'PF', 20, 64, 76, 'R', 4, 2028], ['Mouhamed Gueye', 'PF', 23, 60, 66, 'R', 2, 2027]], O);
  GM.club(['boston-celtics', 'Boston Celtics', 'BOS', 'Boston', 'US', ['#007a33', '#ffffff'], 80, 480, 'TD Garden', 19156], [
    ['Jayson Tatum', 'SF', 28, 90, 90, 'E', 57, 2030], ['Jaylen Brown', 'SG', 29, 89, 89, 'T', 60, 2030],
    ['Derrick White', 'PG', 32, 81, 81, 'D', 28, 2028], ['Payton Pritchard', 'PG', 28, 77, 77, 'T', 30, 2030],
    ['Anfernee Simons', 'SG', 27, 74, 74, 'T', 28, 2027], ['Nikola Vucevic', 'C', 35, 75, 75, 'T', 20, 2028, 'ME'],
    ['Sam Hauser', 'SF', 28, 73, 73, 'T', 10, 2028], ['Neemias Queta', 'C', 27, 72, 73, 'R', 2, 2027, 'PT'],
    ['Baylor Scheierman', 'SF', 22, 66, 71, 'T', 3, 2028], ['Hugo González', 'SG', 20, 62, 72, 'D', 3, 2029, 'ES'],
    ['Luka Garza', 'C', 27, 64, 64, 'R', 2.5, 2027], ['Jordan Walsh', 'SF', 22, 62, 67, 'D', 2.5, 2027]], O);
  GM.club(['brooklyn-nets', 'Brooklyn Nets', 'BKN', 'Brooklyn', 'US', ['#000000', '#ffffff'], 52, 380, 'Barclays Center', 17732], [
    ['Michael Porter Jr.', 'SF', 28, 80, 80, 'T', 40, 2029], ['Cam Thomas', 'SG', 25, 77, 78, 'T', 24, 2027],
    ['Nic Claxton', 'C', 27, 76, 76, 'R', 22, 2027], ['Egor Demin', 'PG', 20, 66, 78, 'P', 7, 2028, 'RU'],
    ['Terance Mann', 'SF', 29, 70, 70, 'D', 15, 2028], ["Day'Ron Sharpe", 'C', 24, 70, 72, 'R', 12, 2028],
    ['Noah Clowney', 'PF', 22, 68, 74, 'D', 4, 2027], ['Ziaire Williams', 'SF', 24, 66, 69, 'T', 8, 2027],
    ['Danny Wolf', 'C', 21, 64, 74, 'P', 5, 2028], ['Nolan Traoré', 'PG', 20, 64, 76, 'P', 5, 2028, 'FR'],
    ['Drake Powell', 'SF', 20, 62, 72, 'D', 4, 2028], ['Ben Saraf', 'SG', 20, 60, 70, 'P', 4, 2028, 'IL']], O);
  GM.club(['charlotte-hornets', 'Charlotte Hornets', 'CHA', 'Charlotte', 'US', ['#00788c', '#1d1160'], 52, 350, 'Spectrum Center', 19077], [
    ['LaMelo Ball', 'PG', 25, 85, 86, 'P', 36, 2029], ['Brandon Miller', 'SF', 23, 80, 84, 'T', 13, 2028],
    ['Miles Bridges', 'PF', 28, 76, 76, 'T', 25, 2028], ['Mark Williams', 'C', 24, 76, 78, 'R', 9, 2027],
    ['Kon Knueppel', 'SG', 20, 76, 84, 'T', 9, 2029], ['Collin Sexton', 'SG', 27, 74, 74, 'T', 17, 2027],
    ['Moussa Diabaté', 'C', 24, 68, 70, 'R', 3, 2027, 'FR'], ['Josh Green', 'SG', 25, 68, 68, 'D', 12, 2028, 'AU'],
    ['Tidjane Salaün', 'SF', 20, 66, 76, 'D', 8, 2028, 'FR'], ['Grant Williams', 'PF', 27, 66, 66, 'D', 13, 2027],
    ['Ryan Kalkbrenner', 'C', 24, 66, 70, 'D', 3, 2028], ['Liam McNeeley', 'SF', 20, 64, 72, 'T', 4, 2028]], O);
  GM.club(['chicago-bulls', 'Chicago Bulls', 'CHI', 'Chicago', 'US', ['#ce1141', '#000000'], 60, 420, 'United Center', 20917], [
    ['Josh Giddey', 'SG', 24, 79, 80, 'P', 25, 2030, 'AU'], ['Coby White', 'PG', 26, 77, 77, 'T', 21, 2028],
    ['Matas Buzelis', 'SF', 22, 76, 84, 'E', 6, 2028], ['Patrick Williams', 'PF', 25, 72, 72, 'D', 18, 2028],
    ['Jaden Ivey', 'SG', 24, 72, 72, 'T', 5, 2027], ['Isaac Okoro', 'SF', 25, 69, 69, 'D', 11, 2028],
    ['Jalen Smith', 'C', 26, 70, 70, 'R', 9, 2028], ['Zach Collins', 'C', 28, 70, 70, 'P', 7, 2027],
    ['Noa Essengue', 'SF', 19, 62, 76, 'T', 6, 2029, 'FR'], ['Julian Phillips', 'SF', 22, 64, 66, 'D', 3, 2027]], O);
  GM.club(['cleveland-cavaliers', 'Cleveland Cavaliers', 'CLE', 'Cleveland', 'US', ['#860038', '#fdbb30'], 72, 400, 'Rocket Arena', 19432], [
    ['Donovan Mitchell', 'SG', 30, 89, 89, 'T', 36, 2028], ['Evan Mobley', 'PF', 25, 87, 89, 'D', 40, 2030],
    ['James Harden', 'PG', 37, 80, 80, 'P', 38, 2027], ['Jarrett Allen', 'C', 28, 80, 80, 'R', 20, 2030],
    ['Max Strus', 'SF', 30, 72, 72, 'T', 16, 2029], ['Sam Merrill', 'SG', 30, 72, 72, 'T', 10, 2028],
    ['Ty Jerome', 'PG', 29, 74, 74, 'T', 10, 2027], ['Lonzo Ball', 'SG', 28, 68, 68, 'P', 10, 2027],
    ['Dean Wade', 'PF', 30, 68, 68, 'D', 6, 2027], ['Jaylon Tyson', 'SG', 23, 66, 72, 'T', 2.5, 2027],
    ['Craig Porter Jr.', 'PG', 26, 66, 66, 'D', 3, 2027], ['Thomas Bryant', 'C', 29, 64, 64, 'R', 2, 2027]], O);
  GM.club(['detroit-pistons', 'Detroit Pistons', 'DET', 'Detroit', 'US', ['#c8102e', '#1d42ba'], 66, 390, 'Little Caesars Arena', 20332], [
    ['Cade Cunningham', 'PG', 25, 90, 91, 'E', 46, 2031], ['Jalen Duren', 'C', 22, 82, 84, 'R', 24, 2030],
    ['Ausar Thompson', 'SF', 23, 77, 83, 'D', 8, 2028], ['Isaiah Stewart', 'PF', 25, 74, 74, 'D', 15, 2030],
    ['Tobias Harris', 'PF', 34, 72, 72, 'E', 12, 2027], ['Duncan Robinson', 'SF', 32, 72, 72, 'T', 20, 2028],
    ['Ron Holland II', 'SF', 20, 68, 78, 'D', 7, 2028], ['Marcus Sasser', 'SG', 25, 66, 68, 'T', 3, 2027],
    ['Daniss Jenkins', 'PG', 24, 66, 68, 'T', 2, 2027], ['Chaz Lanier', 'SG', 23, 64, 68, 'T', 2, 2028],
    ['Paul Reed', 'C', 27, 62, 64, 'R', 2, 2027]], O);
  GM.club(['indiana-pacers', 'Indiana Pacers', 'IND', 'Indianápolis', 'US', ['#002d62', '#fdbb30'], 62, 360, 'Gainbridge Fieldhouse', 17274], [
    ['Tyrese Haliburton', 'PG', 26, 87, 88, 'P', 45, 2029], ['Pascal Siakam', 'PF', 32, 81, 81, 'E', 40, 2028, 'CM'],
    ['Andrew Nembhard', 'PG', 26, 76, 77, 'P', 20, 2030, 'CA'], ['Bennedict Mathurin', 'SG', 24, 75, 77, 'T', 8, 2027, 'CA'],
    ['Aaron Nesmith', 'SF', 26, 74, 74, 'D', 11, 2027], ['Obi Toppin', 'PF', 28, 72, 72, 'T', 14, 2027],
    ['Jarace Walker', 'PF', 22, 70, 76, 'D', 7, 2027], ['T.J. McConnell', 'PG', 34, 70, 70, 'P', 9, 2027],
    ['Jay Huff', 'C', 28, 68, 68, 'T', 5, 2027], ['Isaiah Jackson', 'C', 24, 68, 70, 'R', 5, 2027],
    ['Ben Sheppard', 'SG', 24, 66, 66, 'T', 3, 2027], ['Johnny Furphy', 'SF', 22, 64, 68, 'T', 3, 2028, 'AU']], O);
  GM.club(['miami-heat', 'Miami Heat', 'MIA', 'Miami', 'US', ['#98002e', '#f9a01b'], 70, 430, 'Kaseya Center', 19600], [
    ['Bam Adebayo', 'C', 29, 85, 85, 'D', 37, 2029], ['Tyler Herro', 'SG', 26, 82, 83, 'T', 30, 2030],
    ['Norman Powell', 'SG', 33, 76, 76, 'T', 20, 2028, 'US'], ['Andrew Wiggins', 'SF', 31, 74, 74, 'E', 28, 2027, 'CA'],
    ['Kel\'el Ware', 'C', 22, 74, 80, 'R', 4, 2028], ['Jaime Jaquez Jr.', 'SF', 25, 72, 74, 'E', 4, 2027],
    ['Davion Mitchell', 'PG', 27, 70, 70, 'D', 12, 2027], ['Nikola Jović', 'SF', 23, 68, 72, 'P', 4, 2028, 'RS'],
    ['Simone Fontecchio', 'SF', 30, 68, 68, 'T', 8, 2027, 'IT'], ['Pelle Larsson', 'SG', 24, 64, 68, 'D', 2, 2027, 'SE'],
    ['Dru Smith', 'PG', 28, 64, 64, 'D', 3, 2027]], O);
  GM.club(['milwaukee-bucks', 'Milwaukee Bucks', 'MIL', 'Milwaukee', 'US', ['#00471b', '#eee1c6'], 74, 410, 'Fiserv Forum', 17341], [
    ['Giannis Antetokounmpo', 'PF', 31, 94, 94, 'E', 54, 2028, 'GR'], ['Myles Turner', 'C', 30, 78, 78, 'T', 27, 2029],
    ['Bobby Portis', 'PF', 31, 73, 73, 'T', 13, 2027], ['Kyle Kuzma', 'PF', 31, 72, 72, 'T', 21, 2027],
    ['Ryan Rollins', 'PG', 24, 74, 76, 'P', 12, 2028], ['Kevin Porter Jr.', 'PG', 26, 72, 72, 'P', 3, 2027],
    ['Gary Trent Jr.', 'SG', 27, 70, 70, 'T', 4, 2027], ['AJ Green', 'SG', 26, 70, 70, 'T', 11, 2029],
    ['Cole Anthony', 'PG', 26, 68, 68, 'T', 3, 2027], ['Gary Harris', 'SG', 32, 66, 66, 'D', 3, 2027],
    ['Jericho Sims', 'C', 27, 62, 62, 'R', 2, 2027]], O);
  GM.club(['new-york-knicks', 'New York Knicks', 'NYK', 'Nueva York', 'US', ['#006bb6', '#f58426'], 82, 520, 'Madison Square Garden', 19812], [
    ['Jalen Brunson', 'PG', 30, 89, 89, 'T', 39, 2029], ['Karl-Anthony Towns', 'C', 31, 86, 86, 'T', 49, 2028],
    ['OG Anunoby', 'SF', 29, 81, 81, 'D', 39, 2030], ['Mikal Bridges', 'SF', 30, 80, 80, 'D', 36, 2028],
    ['Josh Hart', 'SG', 31, 76, 76, 'R', 19, 2027], ['Mitchell Robinson', 'C', 28, 74, 74, 'R', 13, 2027],
    ['Miles McBride', 'PG', 26, 74, 74, 'T', 14, 2029], ['Jordan Clarkson', 'SG', 34, 71, 71, 'T', 14, 2027, 'PH'],
    ['Guerschon Yabusele', 'PF', 30, 70, 70, 'T', 5, 2027, 'FR'], ['Landry Shamet', 'SG', 29, 67, 67, 'T', 5, 2027],
    ['Pacôme Dadiet', 'SF', 21, 62, 70, 'T', 3, 2028, 'FR'], ['Ariel Hukporti', 'C', 24, 64, 66, 'R', 2, 2027, 'DE']], O);
  GM.club(['orlando-magic', 'Orlando Magic', 'ORL', 'Orlando', 'US', ['#0077c0', '#c4ced4'], 66, 380, 'Kia Center', 18846], [
    ['Paolo Banchero', 'PF', 24, 87, 90, 'E', 50, 2029], ['Franz Wagner', 'SF', 25, 86, 87, 'E', 44, 2029, 'DE'],
    ['Desmond Bane', 'SG', 28, 82, 82, 'T', 36, 2029], ['Jalen Suggs', 'SG', 25, 79, 80, 'D', 29, 2028],
    ['Wendell Carter Jr.', 'C', 27, 74, 74, 'R', 15, 2028], ['Jonathan Isaac', 'PF', 28, 72, 72, 'D', 15, 2027],
    ['Anthony Black', 'SG', 22, 72, 78, 'P', 6, 2027], ['Moritz Wagner', 'C', 29, 70, 70, 'R', 11, 2027, 'DE'],
    ['Tristan da Silva', 'SF', 25, 68, 72, 'T', 5, 2028, 'DE'], ['Goga Bitadze', 'C', 26, 68, 68, 'D', 10, 2027, 'GE'],
    ['Jase Richardson', 'SG', 20, 62, 72, 'T', 4, 2029]], O);
  GM.club(['philadelphia-76ers', 'Philadelphia 76ers', 'PHI', 'Filadelfia', 'US', ['#006bb6', '#ed174c'], 72, 430, 'Wells Fargo Center', 20478], [
    ['Joel Embiid', 'C', 32, 89, 89, 'E', 55, 2028, 'CM'], ['Tyrese Maxey', 'PG', 25, 88, 90, 'T', 43, 2030],
    ['Paul George', 'SF', 36, 78, 78, 'E', 51, 2028], ['VJ Edgecombe', 'SG', 21, 74, 85, 'D', 12, 2028, 'BS'],
    ['Quentin Grimes', 'SG', 26, 74, 74, 'T', 8, 2027], ['Kelly Oubre Jr.', 'SF', 30, 73, 73, 'T', 8, 2027],
    ['Jared McCain', 'SG', 22, 70, 76, 'T', 4, 2027], ['Andre Drummond', 'C', 33, 68, 68, 'R', 5, 2027],
    ['Kyle Lowry', 'PG', 40, 66, 66, 'P', 3, 2027], ['Dominick Barlow', 'PF', 23, 66, 68, 'R', 3, 2027],
    ['Adem Bona', 'C', 23, 66, 70, 'D', 2, 2027, 'NG'], ['Justin Edwards', 'SF', 22, 64, 68, 'T', 2.5, 2027]], O);
  GM.club(['toronto-raptors', 'Toronto Raptors', 'TOR', 'Toronto', 'US', ['#ce1141', '#000000'], 60, 400, 'Scotiabank Arena', 19800], [
    ['Scottie Barnes', 'SF', 25, 85, 86, 'E', 38, 2030], ['Brandon Ingram', 'SF', 29, 80, 80, 'T', 38, 2027],
    ['Immanuel Quickley', 'PG', 27, 78, 78, 'P', 32, 2030], ['RJ Barrett', 'SG', 26, 77, 77, 'T', 30, 2029, 'CA'],
    ['Jakob Pöltl', 'C', 30, 73, 73, 'D', 20, 2028, 'AT'], ['Gradey Dick', 'SG', 22, 70, 74, 'T', 4, 2027],
    ['Collin Murray-Boyles', 'PF', 20, 70, 78, 'R', 9, 2029], ['Ochai Agbaji', 'SG', 26, 68, 68, 'D', 6, 2027],
    ['Jamal Shead', 'PG', 23, 66, 70, 'D', 2, 2028], ["Ja'Kobe Walter", 'SG', 21, 64, 72, 'T', 4, 2028],
    ['Jamison Battle', 'SF', 24, 64, 68, 'T', 2, 2027]], O);
  GM.club(['washington-wizards', 'Washington Wizards', 'WAS', 'Washington', 'US', ['#002b5c', '#e31837'], 50, 340, 'Capital One Arena', 20356], [
    ['Trae Young', 'PG', 28, 85, 85, 'P', 43, 2027], ['Anthony Davis', 'PF', 33, 83, 83, 'D', 54, 2028],
    ['Alex Sarr', 'C', 21, 74, 84, 'D', 11, 2028, 'FR'], ['Kyshawn George', 'SF', 22, 72, 78, 'T', 4, 2028, 'CH'],
    ['Bilal Coulibaly', 'SF', 22, 72, 78, 'D', 6, 2028, 'FR'], ['Tre Johnson', 'SG', 20, 70, 80, 'T', 10, 2029],
    ['Khris Middleton', 'SF', 35, 70, 70, 'T', 20, 2027], ['Bub Carrington', 'PG', 21, 68, 74, 'P', 5, 2027],
    ['Cam Whitmore', 'SF', 22, 66, 72, 'T', 4, 2027], ['Will Riley', 'SF', 20, 64, 74, 'T', 4, 2029, 'CA']], O);
})();
